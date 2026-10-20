import team from "@/assets/team.jpg";
import training from "@/assets/industry-education.jpg";
import technology from "@/assets/approach-team-reference.png";
import cloud from "@/assets/cloud.jpg";

export const resources = [
  {
    id: "skills-for-indias-ai-job-market",
    category: "Career Insights",
    title:
      "Beyond Traditional Tech Roles: Skills for India's Evolving AI Job Market",
    summary:
      "Explore how AI is creating opportunities beyond conventional software development, including roles that combine engineering, customer understanding, and business problem-solving. Learn practical skills that can help professionals prepare.",
    publishedAt: "October 20, 2026",
    image: technology,
    imageAlt:
      "Technology professionals collaborating around a laptop in a modern office",
    content: [
      {
        heading: "AI work reaches beyond the model",
        paragraphs: [
          "Building an AI feature is only one part of putting it to work. Teams also need people who can understand a customer's workflow, translate a messy business need into a technical plan, and help a solution fit into the systems people already use.",
          "That creates room for hybrid work: engineers who spend time with users, product specialists who can reason about data and APIs, and implementation professionals who can connect technical choices to operational outcomes. These are not replacements for deep engineering roles. They are complementary paths for people who like working across boundaries.",
        ],
      },
      {
        heading: "Build a useful combination of skills",
        paragraphs: [
          "Start with a sound technical base. Depending on the role, that may include programming, data handling, APIs, cloud fundamentals, testing, or a working understanding of how machine-learning systems are evaluated and deployed. Learn enough to investigate a problem and explain what a system can and cannot do.",
          "Then practise discovery and communication. Ask how a task is performed today, where delays or errors arise, what constraints matter, and how a team would know an improvement worked. Clear notes, diagrams, and concise demonstrations are valuable technical outputs too.",
        ],
      },
      {
        heading: "Turn learning into evidence",
        paragraphs: [
          "Choose a small, real-world problem and build a focused demonstration. Explain the user, the workflow, the data assumptions, the design choices, and the limitations. Include tests or an evaluation method rather than presenting a polished interface as proof that the system is reliable.",
          "When exploring roles, read the responsibilities rather than relying on titles. Look for the mix of customer interaction, implementation, engineering depth, and business context that suits you. The supplied Express Computer article is useful context on emerging customer-facing technical work, but a headline about market growth is not a promise of a particular job outcome.",
        ],
      },
    ],
    sources: [
      {
        label:
          "Express Computer: India’s AI boom signals new jobs of the future, beyond traditional tech roles",
        url: "https://www.expresscomputer.in/news/indias-ai-boom-signals-new-jobs-of-the-future-beyond-traditional-tech-roles/140043/",
      },
    ],
  },
  {
    id: "job-ready-tech-skills-roadmap",
    category: "Learning & Training",
    title:
      "Building Job-Ready Tech Skills in 2026: A Practical Learning Roadmap",
    summary:
      "Build relevant technology skills through structured learning, hands-on projects, problem-solving, communication, and continuous upskilling—and turn that learning into clear evidence of job readiness.",
    publishedAt: "October 20, 2026",
    image: training,
    imageAlt:
      "Learners working together on a practical exercise in a study environment",
    content: [
      {
        heading: "Start with a role and a baseline",
        paragraphs: [
          "A learning plan is easier to follow when it points toward work you can describe. Pick a role family—such as web development, data analysis, cloud operations, or quality engineering—and review several current job descriptions. Note the recurring tools, concepts, and tasks, then compare them with what you can already do.",
          "Choose a manageable set of foundations before collecting more courses. For example, a developer might focus on a language, version control, HTTP, testing, and a framework; a cloud learner might begin with networking, identity, command-line skills, and deployment concepts. The exact sequence should reflect the role, not a generic checklist.",
        ],
      },
      {
        heading: "Learn in short cycles and build as you go",
        paragraphs: [
          "Break a topic into a small learning goal, a practical exercise, and a short review. After learning a concept, use it in a project that has a clear user or purpose. A simple application, data investigation, or deployment exercise can reveal gaps that passive study does not.",
          "Keep the project appropriately scoped. Write down the problem, requirements, decisions, and trade-offs. Use tests, a README, or a short walkthrough to show how the work can be used and what remains unfinished. A modest, understandable project is stronger evidence than a copied tutorial with no explanation of your contribution.",
        ],
      },
      {
        heading: "Make problem-solving visible",
        paragraphs: [
          "Employers need to understand how you approach unfamiliar work. Practise describing the issue, the information you gathered, the options you considered, and how you checked the result. When something fails, record the diagnosis and the fix; that process is often more instructive than a perfect first attempt.",
          "Communication is part of technical readiness. Explain a decision for both a technical peer and a non-specialist, ask clarifying questions, and give concise progress updates. These habits help teams collaborate and help you present your skills clearly in interviews.",
        ],
      },
      {
        heading: "Keep a sustainable upskilling loop",
        paragraphs: [
          "Technology changes, but a learning routine should be practical enough to maintain. Set a regular review point, revisit job requirements in your target area, and choose the next skill based on a real gap. Update your portfolio when a project meaningfully improves; do not chase every new tool.",
          "The government and policy references below provide broader context for India's skills and workforce priorities. This roadmap is Vandro's practical guidance, not a claim that any single credential or course guarantees employment.",
        ],
      },
    ],
    sources: [
      {
        label: "Press Information Bureau: Skill development reference",
        url: "https://www.pib.gov.in/PressNoteDetails.aspx?ModuleId=3&NoteId=159219&lang=1&reg=3",
      },
      {
        label: "NITI Aayog: Skills and workforce reference",
        url: "https://origin04082023-niti.nic.in/node/2397",
      },
    ],
  },
  {
    id: "cloud-strategy-cost-security-growth",
    category: "Cloud & Technology",
    title: "Cloud Strategy in 2026: Balancing Cost, Security, and Growth",
    summary:
      "Align cloud adoption with business goals, manage infrastructure costs, improve security, and build for growth with practical workload selection, governance, monitoring, and continuous optimization.",
    publishedAt: "October 20, 2026",
    image: cloud,
    imageAlt: "Server racks in a modern cloud infrastructure environment",
    content: [
      {
        heading: "Begin with the business outcome",
        paragraphs: [
          "Cloud adoption is a means, not an outcome. Before choosing a platform or moving a workload, identify what needs to improve: release speed, resilience, access to managed capabilities, geographic reach, or a more suitable operating model. Agree on how the team will tell whether the change helped.",
          "Inventory applications, data, dependencies, service requirements, and ownership. Some workloads are good candidates for an early move; others may need redesign, additional controls, or a decision to remain where they are. A phased plan makes those differences visible and limits the risk of a rushed migration.",
        ],
      },
      {
        heading: "Make cost a day-to-day operating concern",
        paragraphs: [
          "Estimate the full workload, not just compute. Storage, data transfer, managed services, observability, support, and non-production environments can all affect cost. Assign ownership and tags where practical so teams can connect spending to a service or business function.",
          "Use budgets and alerts to surface unusual changes, and review utilization against actual demand. Right-sizing, scheduling temporary environments, selecting appropriate storage tiers, and improving inefficient architecture can reduce waste. Preserve the reliability and performance the business needs; the cheapest configuration is not automatically the right one.",
        ],
      },
      {
        heading: "Build security and governance into delivery",
        paragraphs: [
          "Establish clear identity and access policies, protect secrets, encrypt sensitive data, and maintain useful logs. Define which services and regions are approved, how data is classified, and who can make changes. Automating repeatable infrastructure helps teams apply these controls consistently.",
          "Security is continuous work. Review permissions, patching, exposed services, backups, recovery procedures, and incident ownership as systems evolve. Make sure the people operating a workload know how to respond when monitoring identifies a problem.",
        ],
      },
      {
        heading: "Review, learn, and optimize",
        paragraphs: [
          "Monitor service health, latency, capacity, availability, and spend together. A change that lowers cost but worsens user experience or operational risk may not be an improvement. Set review intervals and use findings to prioritize the next change.",
          "Gartner's India public-cloud spending forecast is included below as market context. This article does not rely on an unverified spending figure; the practical recommendations here are Vandro's general guidance and should be adapted to each organization's requirements.",
        ],
      },
    ],
    sources: [
      {
        label: "Gartner: India public-cloud spending forecast",
        url: "https://www.gartner.com/en/newsroom/press-releases/2026-06-01-gartner-forecasts-end-user-public-cloud-spending-in-india-to-surpass-17-billion-us-dollars-in-2026",
      },
    ],
  },
  {
    id: "hiring-for-skills-not-job-titles",
    category: "Talent & Hiring",
    title:
      "Hiring for Skills, Not Just Job Titles: A Guide for Growing Tech Teams",
    summary:
      "Define role requirements clearly, assess practical ability, recognize transferable experience, and identify candidates who can grow with the team.",
    publishedAt: "October 20, 2026",
    image: team,
    imageAlt:
      "Technology professionals discussing a project together in a modern office",
    content: [
      {
        heading: "Write the role around the work",
        paragraphs: [
          "Job titles are useful shorthand, but they vary between organizations. Start the hiring brief with the problems the person will work on, the outcomes expected in the first months, and the people they will collaborate with. This gives candidates a clearer picture of the role and gives interviewers a shared basis for evaluation.",
          "Separate requirements into essential capabilities and skills that can be learned after joining. Be specific about the tools or concepts that matter, and explain why they matter. An unnecessarily long list can exclude capable people whose experience comes from a different product, industry, or route into technology.",
        ],
      },
      {
        heading: "Assess practical judgment, not trivia",
        paragraphs: [
          "Use a structured exercise that resembles the work without asking candidates to complete excessive unpaid work. A code review, small debugging task, design discussion, data interpretation, or customer scenario can reveal how someone reasons and communicates.",
          "Share the evaluation criteria in advance. Look for problem framing, sensible trade-offs, checking assumptions, clarity, and willingness to learn—not only a single preferred answer. Keep questions consistent across candidates and give them room to explain their approach.",
        ],
      },
      {
        heading: "Recognize transferable experience",
        paragraphs: [
          "A candidate may have built relevant skills in a different role or environment. Someone from support may be strong at diagnosis and customer communication; an analyst may bring careful data reasoning; a developer from another domain may understand delivery and maintainability. Explore the work they actually did rather than relying only on employer names or familiar titles.",
          "Ask for concrete examples: what was the situation, what did the person own, what choices did they make, and what did they learn? This helps distinguish personal contribution from a team's result while making interviews more consistent and useful.",
        ],
      },
      {
        heading: "Hire for the team you are building",
        paragraphs: [
          "Current capability matters, and so does the ability to grow into the work ahead. Describe the support available—mentoring, documentation, feedback, and learning time—rather than treating adaptability as a substitute for onboarding. Agree on what success looks like and revisit it after the person joins.",
          "A thoughtful skills-based process helps hiring managers make decisions tied to real work, communicate expectations fairly, and identify potential that a job title alone might miss.",
        ],
      },
    ],
    sources: [],
  },
] as const;

export type ResourceArticle = (typeof resources)[number];
