package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"strings"
	"time"

	"github.com/yetone/magpie/internal/edit"
	"github.com/yetone/magpie/internal/library"
	"github.com/yetone/magpie/internal/settings"
)

const allowedFixtures = `C:\Users\Cc\AppData\Local\Temp\p21-sidecar-probe-20261030\fixtures`

var validName = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$`)

type request struct {
	ID      int    `json:"id"`
	Op      string `json:"op"`
	Name    string `json:"name"`
	Agent   string `json:"agent"`
	Enabled *bool  `json:"enabled"`
}

type skill struct {
	Name   string   `json:"name"`
	Agents []string `json:"agents"`
}

type agent struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type response struct {
	ID       int             `json:"id"`
	OK       bool            `json:"ok"`
	Error    string          `json:"error,omitempty"`
	MS       float64         `json:"ms"`
	Skills   []skill         `json:"skills,omitempty"`
	Agents   []agent         `json:"agents,omitempty"`
	Result   *library.Result `json:"result,omitempty"`
	Prepared bool            `json:"prepared,omitempty"`
	Event    string          `json:"event,omitempty"`
}

func inside(root, candidate string) bool {
	root, err := filepath.EvalSymlinks(root)
	if err != nil {
		return false
	}
	candidate, err = filepath.EvalSymlinks(candidate)
	if err != nil {
		return false
	}
	rel, err := filepath.Rel(root, candidate)
	return err == nil && rel != ".." && !strings.HasPrefix(rel, `..\`) && !filepath.IsAbs(rel)
}

func guard() error {
	root := os.Getenv("P21_PROBE_ROOT")
	if root == "" || !inside(allowedFixtures, root) {
		return fmt.Errorf("probe refuses a profile outside the fixed fixture directory")
	}
	home, err := os.UserHomeDir()
	if err != nil || !inside(root, home) || !inside(root, settings.Dir()) {
		return fmt.Errorf("HOME or Magpie config is not inside the fixture")
	}
	for _, key := range []string{
		"XDG_CONFIG_HOME", "XDG_CACHE_HOME", "XDG_DATA_HOME", "APPDATA", "LOCALAPPDATA",
		"CODEX_HOME", "CLAUDE_CONFIG_DIR", "PI_CODING_AGENT_DIR", "HERMES_HOME",
	} {
		if !inside(root, os.Getenv(key)) {
			return fmt.Errorf("%s is not inside the fixture", key)
		}
	}
	if !settings.Load().NoWSLAgents {
		return fmt.Errorf("the write probe requires WSL discovery disabled in its temporary settings")
	}
	return nil
}

func readSkills() ([]skill, error) {
	b, err := os.ReadFile(filepath.Join(settings.Dir(), "library.json"))
	if err != nil {
		return nil, err
	}
	var projection struct {
		Skills []skill `json:"skills"`
	}
	err = json.Unmarshal(b, &projection)
	return projection.Skills, err
}

func main() {
	// Hard-linked fixture executables are inert stand-ins, never the user's agent.
	if !strings.EqualFold(filepath.Base(os.Args[0]), "p21-skills-probe.exe") {
		os.Exit(1)
	}
	if err := guard(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(2)
	}
	scanner := bufio.NewScanner(os.Stdin)
	scanner.Buffer(make([]byte, 4096), 64*1024)
	encoder := json.NewEncoder(os.Stdout)
	prepared := map[string][]string{}
	for scanner.Scan() {
		start := time.Now()
		var q request
		r := response{OK: true}
		err := json.Unmarshal(scanner.Bytes(), &q)
		r.ID = q.ID
		if err == nil {
			switch q.Op {
			case "ping":
			case "state":
				r.Skills, err = readSkills()
			case "agents":
				var view *library.View
				view, err = library.Glance(nil)
				if err == nil {
					for _, a := range view.Agents {
						if a.Skills != "" && !a.Gone && !a.Unseen && !strings.Contains(a.ID, "@wsl:") {
							r.Agents = append(r.Agents, agent{a.ID, a.Name})
						}
					}
				}
			case "toggle", "race-toggle", "prepare", "commit":
				if !validName.MatchString(q.Name) {
					err = fmt.Errorf("invalid skill")
					break
				}
				var rows []skill
				rows, err = readSkills()
				if err != nil {
					break
				}
				at := slices.IndexFunc(rows, func(s skill) bool { return s.Name == q.Name })
				if at < 0 {
					err = fmt.Errorf("skill missing")
					break
				}
				next := slices.Clone(rows[at].Agents)
				if q.Op == "commit" {
					var ok bool
					next, ok = prepared[q.Name]
					if !ok {
						err = fmt.Errorf("no prepared operation")
						break
					}
					delete(prepared, q.Name)
				} else {
					if q.Enabled == nil || !validName.MatchString(q.Agent) {
						err = fmt.Errorf("invalid toggle")
						break
					}
					if _, err = library.Takes(q.Agent, "skills"); err != nil {
						break
					}
					next = slices.DeleteFunc(next, func(id string) bool { return id == q.Agent })
					if *q.Enabled {
						next = append(next, q.Agent)
					}
					slices.Sort(next)
				}
				if q.Op == "prepare" {
					// Test-only barrier exposes the complete-list cross-writer risk.
					prepared[q.Name] = slices.Clone(next)
					r.Prepared = true
					break
				}
				if !slices.Equal(rows[at].Agents, next) {
					write := func() error {
						var writeErr error
						r.Result, writeErr = library.SkillAgents(q.Name, next)
						return writeErr
					}
					if q.Op == "race-toggle" {
						target := filepath.Join(settings.Dir(), "library.json")
						release := filepath.Join(os.Getenv("P21_PROBE_ROOT"), fmt.Sprintf("release-%d", q.ID))
						paused := false
						timedOut := false
						// Existing upstream filter provides a test barrier without changing native code.
						err = edit.Filtered(func(file string, data []byte) []byte {
							if !paused && strings.EqualFold(file, target) {
								paused = true
								_ = encoder.Encode(response{ID: q.ID, OK: true, Event: "before-native-save"})
								deadline := time.Now().Add(20 * time.Second)
								for {
									if _, check := os.Stat(release); check == nil {
										break
									}
									if time.Now().After(deadline) {
										timedOut = true
										break
									}
									time.Sleep(10 * time.Millisecond)
								}
							}
							return data
						}, write)
						if timedOut {
							err = fmt.Errorf("test barrier timed out")
						}
					} else {
						err = write()
					}
				}
				if err == nil {
					r.Skills, err = readSkills()
					updated := slices.IndexFunc(r.Skills, func(s skill) bool { return s.Name == q.Name })
					if err == nil && (updated < 0 || !slices.Equal(r.Skills[updated].Agents, next)) {
						err = fmt.Errorf("native write verification failed")
					}
				}
			default:
				err = fmt.Errorf("unknown operation")
			}
		}
		if err != nil {
			r.OK, r.Error = false, err.Error()
		}
		r.MS = float64(time.Since(start).Microseconds()) / 1000
		if err := encoder.Encode(r); err != nil {
			os.Exit(3)
		}
		if len(os.Args) > 1 && os.Args[1] == "--one-shot" {
			break
		}
	}
	if err := scanner.Err(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(4)
	}
}
