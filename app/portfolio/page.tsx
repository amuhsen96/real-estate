"use client";
import { useState } from "react";

const skills = [
  {
    category: "Programming & Data",
    icon: "💻",
    items: ["Python", "SQL", "Data Modeling (Star Schema)", "ETL/ELT", "Data Quality", "Data Governance"],
  },
  {
    category: "Analytics & BI",
    icon: "📊",
    items: ["Power BI (DAX, Power Query)", "Tableau Desktop & Server", "Alteryx (Certified)", "Exploratory Data Analysis"],
  },
  {
    category: "Data Processing",
    icon: "⚙️",
    items: ["Large-scale Data Cleansing", "Data Preprocessing", "Web Scraping", "Data Mining", "CSV/JSON/DB Integration"],
  },
  {
    category: "Platforms & Tools",
    icon: "🛠️",
    items: ["SharePoint", "PowerApps", "Power Automate", "UiPath (RPA)", "Docker"],
  },
];

const experience = [
  {
    title: "Senior Data Analyst",
    company: "Ideal Value Management Consulting",
    period: "June 2024 – Present",
    location: "Riyadh, Saudi Arabia",
    highlights: [
      "Delivering data-driven solutions using advanced analytical skills in business reporting for executive leadership.",
      "Developed 3+ interactive Power BI dashboards providing real-time insights to the CEO for strategic decision-making.",
      "Standardized and cleansed 100K+ rows across 3 data sources, ensuring accuracy and consistency across all reports.",
      "Collaborated with cross-functional teams to identify and define KPIs for multiple projects.",
      "Established a PMO by aggregating project data and designing comprehensive dashboards in Power BI.",
      "Built SharePoint sites with PowerApps to track budgets, obligations, and event data across organizational units.",
      "Extracted and processed real estate data using web scraping, developing dashboards for pricing trends in Saudi Arabia.",
      "Extracted tenders data from Etimad portal, constructing analytical dashboards for competitor analysis.",
    ],
  },
  {
    title: "Senior Data Analyst",
    company: "AL Moammar for Information Systems",
    period: "March 2023 – June 2024",
    location: "Riyadh, Saudi Arabia",
    highlights: [
      "Constructed SharePoint sites utilizing PowerApps and Power Automate for PMO data storage related to budgets, obligations, and event tracking.",
      "Built SharePoint sites with PowerApps to track budgets, obligations, and event data across organizational units.",
    ],
  },
  {
    title: "Senior Consultant",
    company: "PricewaterhouseCoopers (PwC)",
    period: "January 2021 – March 2023",
    location: "Riyadh, Saudi Arabia",
    highlights: [
      "Cleansed, prepared, and organized real estate data from diverse sources using BI tools for the Project Management Office.",
      "Collected requirements and participated in daily stakeholder meetings, bridging technical and business needs.",
      "Deployed and operated trackers on SharePoint sites to enhance project visibility and governance.",
      "Designed financial dashboards and reports for PMO and finance teams using Power BI, integrating data from multiple sources.",
    ],
  },
  {
    title: "Consultant",
    company: "Devoteam Middle East",
    period: "October 2018 – January 2021",
    location: "Riyadh, Saudi Arabia",
    highlights: [
      "Facilitated client and stakeholder meetings to gather requirements and translate business needs into analytical solutions.",
      "Designed and developed reports and dashboards utilizing Tableau Desktop and Tableau Server.",
      "Led workshops with clients to enhance dashboard functionality and user experience.",
      "Created dashboards and reports integrating data from Excel, SharePoint, and SQL Server.",
      "Analyzed employee, beneficiary, and financial data as resident engineer at GOSI.",
      "Developed KPIs to support data-driven decision-making using various BI tools.",
    ],
  },
];

const certifications = [
  { name: "PL-300: Microsoft Power BI Data Analyst", issuer: "Microsoft", date: "February 2026", icon: "🏅" },
  { name: "Data Analyst Track with Power BI", issuer: "DataCamp", date: "January 2026", icon: "📈" },
  { name: "AI with Work", issuer: "DataCamp", date: "December 2025", icon: "🤖" },
  { name: "Certified Data Management Professional (CDMP)", issuer: "DAMA International", date: "December 2024", icon: "🏆" },
  { name: "Data Governance Specialist Learning Path", issuer: "Dataversity", date: "June 2024", icon: "🎯" },
  { name: "Project Management Professional", issuer: "PM-Tricks", date: "March 2025", icon: "📋" },
  { name: "Alteryx Certificates", issuer: "Alteryx", date: "December 2018", icon: "⚡" },
];

const services = [
  {
    icon: "📊",
    title: "BI Dashboard Development",
    desc: "Interactive Power BI and Tableau dashboards tailored for executive decision-making and KPI tracking.",
  },
  {
    icon: "🔍",
    title: "Data Analysis & Reporting",
    desc: "End-to-end data analysis from raw sources to insightful reports with actionable recommendations.",
  },
  {
    icon: "🧹",
    title: "Data Cleansing & ETL",
    desc: "Large-scale data cleansing, transformation, and pipeline building across multiple data sources.",
  },
  {
    icon: "🕷️",
    title: "Web Scraping & Data Mining",
    desc: "Automated extraction of structured data from web portals and online platforms using Python.",
  },
  {
    icon: "📐",
    title: "Data Governance & Modeling",
    desc: "Designing star schema models and implementing data governance frameworks to ensure data quality.",
  },
  {
    icon: "🏢",
    title: "PMO Analytics & SharePoint",
    desc: "Building SharePoint-based PMO systems with PowerApps and Power Automate for project tracking.",
  },
];

export default function Portfolio() {
  const [activeSection, setActiveSection] = useState("hero");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "#about", label: "About" },
    { href: "#services", label: "Services" },
    { href: "#skills", label: "Skills" },
    { href: "#experience", label: "Experience" },
    { href: "#certifications", label: "Certifications" },
    { href: "#contact", label: "Contact" },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* ─── Navigation ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/90 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            AM
          </span>
          {/* Desktop */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                {l.label}
              </a>
            ))}
            <a
              href="#contact"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
            >
              Hire Me
            </a>
          </div>
          {/* Mobile toggle */}
          <button
            className="md:hidden text-gray-400 hover:text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden px-6 pb-4 flex flex-col gap-4 bg-gray-950 border-t border-gray-800">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                {l.label}
              </a>
            ))}
          </div>
        )}
      </nav>

      {/* ─── Hero ─── */}
      <section
        id="hero"
        className="relative min-h-screen flex items-center justify-center px-6 pt-20"
        style={{
          background:
            "radial-gradient(ellipse at 60% 0%, rgba(37,99,235,0.15) 0%, transparent 60%), radial-gradient(ellipse at 10% 80%, rgba(6,182,212,0.1) 0%, transparent 50%), #030712",
        }}
      >
        {/* Grid lines decoration */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          {/* Avatar placeholder */}
          <div className="mx-auto mb-8 w-28 h-28 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-4xl font-bold text-white shadow-2xl shadow-blue-500/30">
            AM
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm mb-6">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Available for Projects
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold mb-4 leading-tight">
            Abdullah{" "}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Muhsen
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-400 font-medium mb-4">
            Senior Data Analyst
          </p>

          <p className="text-base text-gray-500 mb-2">
            📍 Riyadh, Saudi Arabia &nbsp;|&nbsp; 7+ Years of Experience
          </p>

          <p className="max-w-2xl mx-auto text-gray-400 leading-relaxed mb-10">
            Specializing in end-to-end data solutions — from data sourcing and
            cleansing to advanced analytics and executive reporting. Building
            dashboards that drive informed decisions at the C-suite level.
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <a
              href="#contact"
              className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-all hover:shadow-lg hover:shadow-blue-500/25"
            >
              Get in Touch
            </a>
            <a
              href="#experience"
              className="px-8 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-semibold transition-all border border-gray-700"
            >
              View Experience
            </a>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-6 max-w-lg mx-auto">
            {[
              { value: "7+", label: "Years Experience" },
              { value: "100K+", label: "Rows Processed" },
              { value: "3+", label: "Power BI Dashboards" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-bold text-blue-400">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── About ─── */}
      <section id="about" className="py-24 px-6 bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <SectionHeader tag="WHO I AM" title="About Me" />
          <div className="mt-12 grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-gray-300 leading-relaxed text-lg mb-6">
                Senior Data Analyst with <strong className="text-white">7+ years of experience</strong>{" "}
                specializing in end-to-end data solutions, from data sourcing and cleansing to advanced
                analytics and executive reporting.
              </p>
              <p className="text-gray-400 leading-relaxed mb-6">
                Proven expertise in processing and organizing large-scale datasets (100K+ rows) from
                diverse sources, conducting exploratory data analysis to uncover patterns and trends, and
                building interactive dashboards that drive informed decision-making.
              </p>
              <p className="text-gray-400 leading-relaxed">
                Proficient in Python, SQL, and certified in Alteryx for data manipulation and analytics
                workflows. Experienced in cross-functional collaboration with both technical and
                non-technical stakeholders across consulting engagements at PwC and Devoteam Middle East.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Name", value: "Abdullah Muhsen" },
                { label: "Location", value: "Riyadh, Saudi Arabia" },
                { label: "Email", value: "abdullahmuhsen96@gmail.com" },
                { label: "Phone", value: "+966 59 210 9018" },
                { label: "Languages", value: "Arabic (Native), English (Professional)" },
                { label: "Education", value: "B.Sc. Computer Information Systems" },
              ].map((item) => (
                <div key={item.label} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                  <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">{item.label}</div>
                  <div className="text-sm text-white font-medium">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Services ─── */}
      <section id="services" className="py-24 px-6 bg-gray-950">
        <div className="max-w-6xl mx-auto">
          <SectionHeader tag="WHAT I OFFER" title="Services" />
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((s) => (
              <div
                key={s.title}
                className="group p-6 bg-gray-900 rounded-2xl border border-gray-800 hover:border-blue-500/50 hover:bg-gray-800 transition-all"
              >
                <div className="text-4xl mb-4">{s.icon}</div>
                <h3 className="text-white font-semibold text-lg mb-2">{s.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Skills ─── */}
      <section id="skills" className="py-24 px-6 bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <SectionHeader tag="CORE COMPETENCIES" title="Skills" />
          <div className="mt-12 grid sm:grid-cols-2 gap-6">
            {skills.map((group) => (
              <div
                key={group.category}
                className="p-6 bg-gray-950 rounded-2xl border border-gray-800"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{group.icon}</span>
                  <h3 className="text-white font-semibold">{group.category}</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.items.map((skill) => (
                    <span
                      key={skill}
                      className="px-3 py-1 bg-blue-500/10 text-blue-300 rounded-full text-xs border border-blue-500/20"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Methodologies */}
          <div className="mt-6 p-6 bg-gray-950 rounded-2xl border border-gray-800">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">🔄</span>
              <h3 className="text-white font-semibold">Methodologies & Soft Skills</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {["Agile", "Cross-functional Collaboration", "Stakeholder Management", "Requirements Gathering", "Arabic (Native)", "English (Professional)"].map(
                (m) => (
                  <span
                    key={m}
                    className="px-3 py-1 bg-cyan-500/10 text-cyan-300 rounded-full text-xs border border-cyan-500/20"
                  >
                    {m}
                  </span>
                )
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Experience ─── */}
      <section id="experience" className="py-24 px-6 bg-gray-950">
        <div className="max-w-6xl mx-auto">
          <SectionHeader tag="WORK HISTORY" title="Experience" />
          <div className="mt-12 relative">
            {/* Timeline line */}
            <div className="absolute left-0 md:left-8 top-0 bottom-0 w-px bg-gray-800" />

            <div className="flex flex-col gap-10">
              {experience.map((exp, i) => (
                <div key={i} className="relative pl-8 md:pl-24">
                  {/* Dot */}
                  <div className="absolute left-[-5px] md:left-[27px] top-1 w-3 h-3 rounded-full bg-blue-500 border-2 border-gray-950 shadow-lg shadow-blue-500/50" />

                  <div className="p-6 bg-gray-900 rounded-2xl border border-gray-800 hover:border-gray-700 transition-colors">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                      <h3 className="text-white font-bold text-lg">{exp.title}</h3>
                      <span className="text-xs text-gray-500 bg-gray-800 px-3 py-1 rounded-full whitespace-nowrap">
                        {exp.period}
                      </span>
                    </div>
                    <p className="text-blue-400 font-medium mb-1">{exp.company}</p>
                    <p className="text-gray-500 text-sm mb-4">📍 {exp.location}</p>
                    <ul className="space-y-2">
                      {exp.highlights.map((h, j) => (
                        <li key={j} className="flex gap-3 text-gray-400 text-sm">
                          <span className="text-blue-500 mt-0.5 flex-shrink-0">▸</span>
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Education ─── */}
      <section className="py-16 px-6 bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <SectionHeader tag="ACADEMICS" title="Education" />
          <div className="mt-10">
            <div className="p-6 bg-gray-950 rounded-2xl border border-gray-800 flex flex-wrap gap-6 items-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-3xl flex-shrink-0">
                🎓
              </div>
              <div>
                <h3 className="text-white font-bold text-xl">
                  Bachelor&apos;s Degree in Computer Information Systems
                </h3>
                <p className="text-blue-400 mt-1">
                  Jordan University of Science and Technology (JUST)
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Certifications ─── */}
      <section id="certifications" className="py-24 px-6 bg-gray-950">
        <div className="max-w-6xl mx-auto">
          <SectionHeader tag="CREDENTIALS" title="Certifications & Training" />
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {certifications.map((cert) => (
              <div
                key={cert.name}
                className="p-5 bg-gray-900 rounded-2xl border border-gray-800 hover:border-blue-500/40 transition-colors"
              >
                <div className="text-3xl mb-3">{cert.icon}</div>
                <h4 className="text-white font-semibold text-sm mb-1 leading-snug">{cert.name}</h4>
                <p className="text-blue-400 text-xs mb-1">{cert.issuer}</p>
                <p className="text-gray-500 text-xs">{cert.date}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Contact ─── */}
      <section id="contact" className="py-24 px-6 bg-gray-900">
        <div className="max-w-3xl mx-auto text-center">
          <SectionHeader tag="GET IN TOUCH" title="Contact Me" />
          <p className="mt-4 text-gray-400 leading-relaxed">
            Looking for a data-driven analyst to transform your raw data into actionable insights?
            Let&apos;s connect.
          </p>

          <div className="mt-12 grid sm:grid-cols-3 gap-4">
            <ContactCard
              icon="✉️"
              label="Email"
              value="abdullahmuhsen96@gmail.com"
              href="mailto:abdullahmuhsen96@gmail.com"
            />
            <ContactCard
              icon="📞"
              label="Phone"
              value="+966 59 210 9018"
              href="tel:+966592109018"
            />
            <ContactCard
              icon="📍"
              label="Location"
              value="Riyadh, Saudi Arabia"
              href="#"
            />
          </div>

          <div className="mt-10 p-8 bg-gray-950 rounded-2xl border border-gray-800">
            <h3 className="text-white font-semibold text-xl mb-6">Send a Message</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                window.location.href = "mailto:abdullahmuhsen96@gmail.com";
              }}
              className="flex flex-col gap-4 text-left"
            >
              <div className="grid sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Your Name"
                  required
                  className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
                />
                <input
                  type="email"
                  placeholder="Your Email"
                  required
                  className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>
              <input
                type="text"
                placeholder="Subject"
                className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
              />
              <textarea
                rows={5}
                placeholder="Your Message"
                required
                className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm resize-none"
              />
              <button
                type="submit"
                className="py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-blue-500/25"
              >
                Send Message
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="py-8 px-6 bg-gray-950 border-t border-gray-800 text-center">
        <p className="text-gray-500 text-sm">
          © {new Date().getFullYear()} Abdullah Muhsen · Senior Data Analyst · Riyadh, Saudi Arabia
        </p>
      </footer>
    </div>
  );
}

function SectionHeader({ tag, title }: { tag: string; title: string }) {
  return (
    <div className="text-center md:text-left">
      <span className="text-xs font-semibold tracking-widest text-blue-400 uppercase">{tag}</span>
      <h2 className="mt-2 text-3xl md:text-4xl font-bold text-white">{title}</h2>
    </div>
  );
}

function ContactCard({
  icon,
  label,
  value,
  href,
}: {
  icon: string;
  label: string;
  value: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="block p-5 bg-gray-950 rounded-2xl border border-gray-800 hover:border-blue-500/40 transition-colors group"
    >
      <div className="text-3xl mb-3">{icon}</div>
      <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">{label}</div>
      <div className="text-sm text-white font-medium group-hover:text-blue-400 transition-colors break-all">
        {value}
      </div>
    </a>
  );
}
