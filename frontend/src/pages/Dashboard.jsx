import { useMemo, useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip
} from "recharts";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartColumn, faChartLine, faListCheck, faBook, faClockRotateLeft, faWandMagicSparkles, faGear } from "@fortawesome/free-solid-svg-icons";
import Navbar from "../components/Navbar";
import "./Dashboard.css";

/* ---- sample data ---- */
const SAMPLE_PAST = [
  { id: "int-1007", date: "Aug 09", difficulty: "Medium", score: 78, durationMin: 48, result: "Improve" },
  { id: "int-1006", date: "Aug 06", difficulty: "Hard",   score: 84, durationMin: 60, result: "Pass"     },
  { id: "int-1005", date: "Aug 02", difficulty: "Medium", score: 72, durationMin: 50, result: "Improve" },
  { id: "int-1004", date: "Jul 30", difficulty: "Easy",   score: 90, durationMin: 35, result: "Pass"     },
  { id: "int-1003", date: "Jul 27", difficulty: "Hard",   score: 69, durationMin: 62, result: "Improve" },
];

const DRILLS = [
  { id: "d1", title: "Arrays & Hashing", difficulty: "Easy",   estMin: 15 },
  { id: "d2", title: "Two Pointers",     difficulty: "Medium", estMin: 20 },
  { id: "d3", title: "Binary Search",    difficulty: "Medium", estMin: 20 },
  { id: "d4", title: "Graph Traversal",  difficulty: "Hard",   estMin: 30 },
];

const COMPANY_TAGS = ["Google","Meta","Amazon","Apple","Microsoft","Airbnb","Uber","Stripe","Databricks"];
const TYPE_TAGS    = ["arrays","two-pointers","sliding-window","binary-search","dp","graph","tree","trie","heap","greedy","backtracking"];

function ToneBadge({ tone = "neutral", children }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

export default function CodePage() {
  // settings
  const [lang, setLang] = useState("py");
  const [timeLimit, setTimeLimit] = useState(45);
  const [diff, setDiff] = useState("random");
  const [tags, setTags] = useState(["arrays", "two-pointers"]);

  // modal state
  const [open, setOpen] = useState(false);
  const [draftLang, setDraftLang] = useState(lang);
  const [draftDiff, setDraftDiff] = useState(diff);
  const [draftTime, setDraftTime] = useState(timeLimit);

  // tag menu state
  const [tagMenuOpen, setTagMenuOpen] = useState(false);
  const tagMenuRef = useRef(null);

  // Close tag menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (tagMenuRef.current && !tagMenuRef.current.contains(event.target)) {
        setTagMenuOpen(false);
      }
    };

    if (tagMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [tagMenuOpen]);

  // chart data
  const LAST_5 = useMemo(() => {
    const last = SAMPLE_PAST.slice(-5).reverse();
    return last.map((i, idx) => ({ attempt: idx + 1, score: i.score }));
  }, []);
  const avgScore = useMemo(
    () => Math.round(LAST_5.reduce((a, b) => a + b.score, 0) / LAST_5.length),
    [LAST_5]
  );

  // tags
  const addTag = (raw) => {
    const v = raw.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (v && !tags.includes(v)) setTags((p) => [...p, v]);
  };
  const removeTag = (t) => setTags((p) => p.filter((x) => x !== t));

  const tagsParam = encodeURIComponent(tags.join(","));
  const interviewLink = `/code/start?lang=${lang}&diff=${diff}&time=${timeLimit}&tags=${tagsParam}`;

  return (
    <div className="dash">
      <div className="dash__bg" />
      <Navbar />
      <main className="dash__container">
        {/* Header */}
        <header className="dash__header">
          <h1 className="dash__title">Dashboard</h1>
          <p className="dash__subtitle">
            Average (last 5 attempts): <span className="text-strong">{avgScore}%</span>
          </p>
        </header>

        {/* Graph + Recommendations */}
        <section className="grid-12 gap-16 mb-24">
          {/* Graph card */}
          <div className="card lg-span-5">
            <div className="card__head">
              <div className="card__title">
                <FontAwesomeIcon icon={faChartLine} className="mr-8" size="sm" />
                Graph progress
              </div>
              <div className="card__desc">Last 5 attempts (score out of 100)</div>
            </div>
            <div className="card__body">
              <div className="chart">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={LAST_5} margin={{ left: 6, right: 6 }}>
                    <defs>
                      <linearGradient id="fillScore" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="5%" stopColor="#8fb3ff" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#8fb3ff" stopOpacity={0.06} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="attempt" tick={{ fill: "#cfcfcf", fontSize: 11, fontFamily: "'Inter', system-ui, -apple-system, sans-serif", fontWeight: 400 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} ticks={[0,20,40,60,80,100]} tick={{ fill: "#cfcfcf", fontSize: 11, fontFamily: "'Inter', system-ui, -apple-system, sans-serif", fontWeight: 400 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ stroke: "rgba(255,255,255,0.15)" }}
                      contentStyle={{
                        background: "rgba(12,14,18,.92)",
                        border: "1px solid rgba(255,255,255,.08)",
                        borderRadius: 12,
                      }}
                      labelFormatter={(l) => `Attempt ${l}`}
                      formatter={(v) => [`${v}`, "Score"]}
                    />
                    <Area type="monotone" dataKey="score" stroke="#9bb9ff" strokeWidth={2} fill="url(#fillScore)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="card lg-span-7">
            <div className="card__head">
              <div className="card__title">
                <FontAwesomeIcon icon={faListCheck} className="mr-8" size="sm" />
                Recommended problems
              </div>
              <div className="card__desc">Short focused exercises based on your history</div>
            </div>
            <div className="card__body">
              <div className="grid-2 gap-12">
                {DRILLS.map((d) => (
                  <div key={d.id} className="mini-card">
                    <div className="mini-card__top">
                      <div>
                        <p className="mini-card__title">{d.title}</p>
                        <p className="mini-card__meta">{d.estMin} min</p>
                      </div>
                      <ToneBadge
                        tone={d.difficulty === "Easy" ? "green" : d.difficulty === "Medium" ? "amber" : "rose"}
                      >
                        {d.difficulty}
                      </ToneBadge>
                    </div>
                    <div className="mini-card__actions">
                      <button className="btn btn--primary">Practice</button>
                      <button className="btn btn--ghost">Details</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Generate + Tags */}
        <section className="card card--gradient mb-24">
          <div className="card__head">
            <div className="card__title">
              <FontAwesomeIcon icon={faBook} className="mr-8" size="sm" />
              Generate interview
            </div>
            <div className="card__desc">Use your current settings and tags to create a new mock interview.</div>
          </div>
          <div className="card__body">
            <div className="interview-settings__content">
              <div className="interview-settings__row">
                <div className="interview-settings__info">
                  <span>Difficulty: <span className="interview-settings__info-text">{diff}</span></span>
                  <span className="interview-settings__bullet">•</span>
                  <span>Language: <span className="interview-settings__info-text">Python</span></span>
                  <span className="interview-settings__bullet">•</span>
                  <span>Time: <span className="interview-settings__info-text">{timeLimit} min</span></span>
                </div>
                <div className="interview-settings__actions">
                  <button
                    className="btn btn--outline"
                    onClick={() => { setDraftLang(lang); setDraftDiff(diff); setDraftTime(timeLimit); setOpen(true); }}
                  >
                    <FontAwesomeIcon icon={faGear} className="mr-4" size="sm" />
                    Edit settings
                  </button>
                  <Link to={interviewLink} className="btn btn--cta">
                    <FontAwesomeIcon icon={faWandMagicSparkles} className="mr-4" size="sm" />
                    Generate interview
                  </Link>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="label">Current tags</label>
                <div className="row wrap gap-8 tags">
                  {tags.length === 0 && <span className="text-muted">No tags yet.</span>}
                  {tags.map((t) => (
                    <span key={t} className="tag">
                      <span className="tag__text">{t}</span>
                      <button className="tag__x" onClick={() => removeTag(t)} aria-label={`Remove ${t}`}>×</button>
                    </span>
                  ))}
                </div>

                <div className="row wrap gap-12 mt-12">
                  <div className="tag-menu-wrapper" ref={tagMenuRef}>
                    <button 
                      className="btn btn--outline"
                      onClick={() => setTagMenuOpen(!tagMenuOpen)}
                    >
                      Add a tag
                    </button>
                    {tagMenuOpen && (
                      <div className="tag-menu">
                        <div className="tag-menu__category">
                          Company
                          <div className="tag-menu__submenu">
                            {COMPANY_TAGS.map(company => (
                              <button
                                key={company}
                                className="tag-menu__option"
                                onClick={() => {
                                  addTag(company);
                                  setTagMenuOpen(false);
                                }}
                              >
                                {company}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="tag-menu__category">
                          Type of problem
                          <div className="tag-menu__submenu">
                            {TYPE_TAGS.map(type => (
                              <button
                                key={type}
                                className="tag-menu__option"
                                onClick={() => {
                                  addTag(type);
                                  setTagMenuOpen(false);
                                }}
                              >
                                {type}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Past problems */}
        <section className="card">
          <div className="card__head">
            <div className="card__title">
              <FontAwesomeIcon icon={faClockRotateLeft} className="mr-8" size="sm" />
              Past problems
            </div>
            <div className="card__desc">Recent attempts and results</div>
          </div>
          <div className="card__body">
            <ul className="list divide">
              {SAMPLE_PAST.map((item) => (
                <li key={item.id} className="list__row">
                  <div className="minw">
                    <p className="list__title">
                      {item.date} • <span className="text-muted">{item.id}</span>
                    </p>
                    <p className="list__sub">
                      {item.durationMin} min • {item.difficulty}
                    </p>
                  </div>
                  <div className="row gap-12">
                    <ToneBadge tone={item.result === "Pass" ? "green" : "amber"}>{item.result}</ToneBadge>
                    <span className="score">{item.score}%</span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="right mt-12">
              <button className="btn btn--ghost">View all</button>
            </div>
          </div>
        </section>
      </main>

      {/* Modal */}
      {open && (
        <div className="modal" onClick={() => setOpen(false)}>
          <div className="modal__panel" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal__title">Configure interview settings</h3>
            <p className="modal__desc">Choose the language, difficulty, and time. Save to apply.</p>

            <div className="form-grid mt-16">
              <label>Language</label>
              <select value={draftLang} onChange={(e)=>setDraftLang(e.target.value)} className="select">
                <option value="py">Python</option>
              </select>

              <label>Difficulty</label>
              <select value={draftDiff} onChange={(e)=>setDraftDiff(e.target.value)} className="select">
                <option value="random">Random</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>

              <label>Time (min)</label>
              <div>
                <input
                  type="range"
                  min={15}
                  max={90}
                  step={5}
                  value={draftTime}
                  onChange={(e)=>setDraftTime(parseInt(e.target.value))}
                  className="range"
                />
                <div className="help mt-6">{draftTime} minutes</div>
              </div>
            </div>

            <div className="right mt-20">
              <button className="btn btn--ghost mr-8" onClick={()=>setOpen(false)}>Cancel</button>
              <button
                className="btn btn--primary"
                onClick={() => { setLang(draftLang); setDiff(draftDiff); setTimeLimit(draftTime); setOpen(false); }}
              >
                Save settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
