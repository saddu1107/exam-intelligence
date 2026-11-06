const subjects = [
  { name: "Indian Polity", detail: "Citizenship, Constitution, Parliament", lectures: 12, icon: "⚖️" },
  { name: "History", detail: "Ancient, Medieval and Modern India", lectures: 0, icon: "🏛️" },
  { name: "Geography", detail: "Indian and World Geography", lectures: 0, icon: "🌍" },
  { name: "Mathematics", detail: "Arithmetic and Advanced Maths", lectures: 0, icon: "📐" },
  { name: "Reasoning", detail: "Verbal and Non-verbal Reasoning", lectures: 0, icon: "🧩" },
  { name: "English", detail: "Grammar, Vocabulary and Comprehension", lectures: 0, icon: "📘" }
];

export default function Home() {
  return (
    <main className="shell">
      <nav className="nav">
        <a className="brand" href="#"><span className="brand-mark">EI</span><span>EXAM <b>INTELLIGENCE</b></span></a>
        <div className="nav-links"><a href="#subjects">Subjects</a><a href="#how">How it works</a><a className="login" href="#student">Student login</a></div>
      </nav>

      <section className="hero">
        <div className="eyebrow">YOUR LECTURE. YOUR TEST. YOUR RANK.</div>
        <h1>Learn the topic.<br/><span>Prove what you know.</span></h1>
        <p>Watch focused video lectures, study the notes, and attempt a timed test created from that exact lesson. Track every result and climb the leaderboard.</p>
        <div className="hero-actions"><a className="primary" href="#subjects">Explore subjects <span>→</span></a><a className="secondary" href="#how">How it works</a></div>
        <div className="hero-stats"><div><strong>20 sec</strong><small>per question</small></div><div><strong>30 / 50</strong><small>questions per lecture test</small></div><div><strong>Free</strong><small>initial student access</small></div></div>
      </section>

      <section id="subjects" className="section">
        <div className="section-head"><div><div className="eyebrow">START PREPARING</div><h2>Choose your subject</h2></div><span className="muted">SSC • Railway • More exams later</span></div>
        <div className="subject-grid">
          {subjects.map((s) => <article className="subject-card" key={s.name}>
            <div className="subject-icon">{s.icon}</div><h3>{s.name}</h3><p>{s.detail}</p>
            <div className="card-foot"><span>{s.lectures ? `${s.lectures} sample lectures` : "Coming soon"}</span><span className="arrow">↗</span></div>
          </article>)}
        </div>
      </section>

      <section id="how" className="how">
        <div className="eyebrow">A SIMPLE LEARNING LOOP</div><h2>One lecture at a time.</h2>
        <div className="steps">
          {[
            ["01", "Watch", "Learn from the embedded video lecture."],
            ["02", "Read", "Use the lecture PDF or notes alongside it."],
            ["03", "Attempt", "Take a 30- or 50-question timed test."],
            ["04", "Improve", "Review mistakes, marks and your rank."]
          ].map(([n,t,d]) => <div className="step" key={n}><span>{n}</span><h3>{t}</h3><p>{d}</p></div>)}
        </div>
      </section>

      <footer><a className="brand" href="#"><span className="brand-mark">EI</span><span>EXAM <b>INTELLIGENCE</b></span></a><span>Prepare Smart. Perform Better.</span></footer>
    </main>
  );
}
