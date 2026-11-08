import { Arrow, externalLinkProps } from '../components/SiteChrome'
import { content, language, ui } from '../content'

function LinkIcon({ label }: { label: string }) {
  if (label === 'GitHub') {
    return (
      <span
        className="hero-link-icon hero-link-icon--github"
        aria-hidden="true"
      />
    )
  }

  if (label === 'LinkedIn') {
    return (
      <svg
        className="hero-link-icon hero-link-icon--brand"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M5.3 7.4a2.1 2.1 0 1 0 0-4.2 2.1 2.1 0 0 0 0 4.2ZM3.6 20.5h3.5V9H3.6v11.5ZM9.4 9h3.4v1.6c.5-.9 1.6-1.9 3.4-1.9 3.6 0 4.3 2.4 4.3 5.5v6.3h-3.6v-5.6c0-1.3 0-3-1.9-3s-2.1 1.4-2.1 2.9v5.7H9.4V9Z" />
      </svg>
    )
  }

  return (
    <svg className="hero-link-icon" viewBox="0 0 24 24" aria-hidden="true">
      {label === 'Email' ? (
        <path d="M3 6h18v12H3V6Zm1 1 8 6 8-6" />
      ) : (
        <path d="M6 3h9l3 3v15H6V3Zm8 0v4h4M9 11h6M9 15h6" />
      )}
    </svg>
  )
}

export default function PortfolioPage() {
  return (
    <>
      <section className="hero portfolio-hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">{content.profile.eyebrow}</p>
          <h1>
            {content.profile.headline.split('\n').map((line) => (
              <span key={line}>{line}</span>
            ))}
          </h1>
          <p className="hero-intro">{content.profile.intro}</p>
          <div className="hero-links" aria-label={ui.contactLinks}>
            <a href={`mailto:${content.profile.email}`}>
              <LinkIcon label="Email" /> Email <Arrow />
            </a>
            {content.profile.links.map((link) => (
              <a key={link.url} href={link.url} {...externalLinkProps}>
                <LinkIcon label={link.label} /> {link.label} <Arrow />
              </a>
            ))}
          </div>
        </div>
      </section>

      <section
        className="section impact-section"
        aria-labelledby="impact-title"
      >
        <div className="section-heading" data-reveal>
          <p className="eyebrow">01 · SELECTED WORK</p>
          <h2 id="impact-title">{ui.impactHeading}</h2>
        </div>
        <div className="impact-grid">
          {content.featuredImpacts.map((impact) => (
            <article key={impact.title}>
              <p className="impact-organization">{impact.organization}</p>
              <h3>{impact.title}</h3>
              <div className="impact-copy">
                {impact.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section" id="experience">
        <div className="section-heading" data-reveal>
          <p className="eyebrow">02 · EXPERIENCE</p>
          <h2>{ui.experienceHeading}</h2>
        </div>
        <div className="timeline">
          {content.experiences.map((experience, index) => (
            <article className="experience" key={experience.company}>
              <div className="experience-index" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </div>
              <div className="experience-main">
                <div className="experience-title">
                  <div>
                    <h3>
                      <a
                        className="company-link"
                        href={experience.website}
                        aria-label={`${experience.company} ${ui.website}`}
                        {...externalLinkProps}
                      >
                        {experience.company} <Arrow />
                      </a>
                    </h3>
                    <p>{experience.role}</p>
                  </div>
                  <time>{experience.period}</time>
                </div>
                <p className="summary">{experience.summary}</p>
                <dl className="responsibilities" aria-label={ui.roleScope}>
                  {experience.responsibilities.map((responsibility) => (
                    <div key={responsibility.area}>
                      <dt>{responsibility.area}</dt>
                      <dd>{responsibility.description}</dd>
                    </div>
                  ))}
                </dl>
                <div className="inline-metrics">
                  {experience.metrics.map((metric) => (
                    <span key={metric.label}>
                      <strong>{metric.value}</strong> {metric.label}
                    </span>
                  ))}
                </div>
                <div className="experience-details">
                  <div className="case-studies">
                    {experience.caseStudies.map((caseStudy) => (
                      <article className="case-study" key={caseStudy.title}>
                        <h4>{caseStudy.title}</h4>
                        <div className="case-copy">
                          <p className="case-context">{caseStudy.problem}</p>
                          {'analysis' in caseStudy && (
                            <p className="case-analysis">
                              {caseStudy.analysis}
                            </p>
                          )}
                          <p>{caseStudy.action}</p>
                          <p className="case-result">{caseStudy.result}</p>
                        </div>
                        {'flow' in caseStudy && caseStudy.flow && (
                          <div
                            className="case-flow"
                            aria-label={`${caseStudy.title} ${ui.flow}`}
                          >
                            {caseStudy.flow.map((flow) => (
                              <section key={flow.label}>
                                <h5>{flow.label}</h5>
                                <ol>
                                  {flow.steps.map((step) => (
                                    <li key={step}>{step}</li>
                                  ))}
                                </ol>
                              </section>
                            ))}
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                  <h4 className="contribution-title">{ui.contributions}</h4>
                  <ul className="contributions">
                    {experience.highlights.map((highlight) => (
                      <li key={highlight}>{highlight}</li>
                    ))}
                  </ul>
                  <ul
                    className="tags"
                    aria-label={`${experience.company} ${ui.technologies}`}
                  >
                    {experience.skills.map((skill) => (
                      <li key={skill}>{skill}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section projects-section" id="projects">
        <div className="section-heading" data-reveal>
          <p className="eyebrow">03 · SELECTED PROJECTS</p>
          <h2>{ui.projectsHeading}</h2>
        </div>
        <div className="projects">
          {content.projects.map((project, index) => (
            <article className="project" key={project.title}>
              <div className="project-visual">
                <span className="project-number" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <img
                  src={project.image.src}
                  alt={project.image.alt}
                  width={project.image.width}
                  height={project.image.height}
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="project-copy">
                <p className="project-subtitle">{project.subtitle}</p>
                <h3>{project.title}</h3>
                <p className="summary">{project.description}</p>
                <div className="inline-metrics">
                  {project.metrics.map((metric) => (
                    <span key={metric.label}>
                      <strong>{metric.value}</strong> {metric.label}
                    </span>
                  ))}
                </div>
                <details className="disclosure">
                  <summary>
                    <span>{ui.projectDetails}</span>
                    <span className="disclosure-action" aria-hidden="true" />
                  </summary>
                  <div className="disclosure-content">
                    <ul>
                      {project.highlights.map((highlight) => (
                        <li key={highlight}>{highlight}</li>
                      ))}
                    </ul>
                    <ul
                      className="tags"
                      aria-label={`${project.title} ${ui.technologies}`}
                    >
                      {project.skills.map((skill) => (
                        <li key={skill}>{skill}</li>
                      ))}
                    </ul>
                  </div>
                </details>
                {project.links.map((link) => (
                  <a
                    className="project-link"
                    key={link.url}
                    href={link.url}
                    {...externalLinkProps}
                  >
                    {language === 'en'
                      ? `${ui.viewOn} ${link.label}`
                      : `${link.label}${ui.viewOn}`}{' '}
                    <Arrow />
                  </a>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section skills-section" id="skills">
        <div className="section-heading" data-reveal>
          <p className="eyebrow">04 · SKILLS</p>
          <h2>{ui.skillsHeading}</h2>
        </div>
        <div className="skill-grid">
          {content.skillGroups.map((group) => (
            <article key={group.title}>
              <p>{group.description}</p>
              <h3>{group.title}</h3>
              <ul>
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}
