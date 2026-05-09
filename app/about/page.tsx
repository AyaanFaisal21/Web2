export default function AboutPage() {
  return (
    <main className="min-h-screen pt-24 pb-16">
      <div className="mx-auto max-w-4xl px-6">
        <h1 className="text-4xl font-bold mb-8">About Me</h1>
        <div className="prose prose-invert max-w-none">
          <p className="text-lg text-muted-foreground leading-relaxed">
            I&apos;m apart of the Rutgers University Honors College, and for as long as I can remember, 
            I&apos;ve loved building things and seeing them function. Software engineering offered me a fast, 
            creative, and non-resource-intensive way to do that.
          </p>
          <p className="text-lg text-muted-foreground leading-relaxed mt-4">
            I study Computer Science, Data Science, and Economics because I&apos;m interested in how machine learning 
            can solve real problems, and how those solutions connect to markets and decision-making. I&apos;ve gained 
            experience across full-stack development, data analysis, and finance-focused projects.
          </p>
          <p className="text-lg text-muted-foreground leading-relaxed mt-4">
            When I build, I start with problems I&apos;ve seen firsthand and design with the people using the product 
            in mind: users, customers, and teammates. I learn quickly, collaborate well, and love turning ideas 
            into tools that actually get used.
          </p>
        </div>
      </div>
    </main>
  )
}
