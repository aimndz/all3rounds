import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Privacy Policy — All3Rounds",
  description: "Privacy Policy for All3Rounds - The Filipino Battle Rap Archive.",
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      
      <main className="mx-auto flex-1 w-full max-w-4xl px-6 py-12 md:py-20">
        <div className="space-y-12">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl text-foreground">Privacy Policy</h1>
            <p className="text-sm text-muted-foreground font-medium">Last updated: March 2026</p>
          </div>

          <div className="prose prose-invert prose-yellow max-w-none space-y-6 text-muted-foreground leading-relaxed">
            <p>
              Welcome to All3Rounds (“we”, “our”, “us”). This Privacy Policy explains how information is collected and used when you visit <a href="https://all3rounds.com" className="text-foreground underline underline-offset-4 hover:text-yellow-400 transition-colors">all3rounds.com</a>.
            </p>
            
            <p>
              All3Rounds is a non-profit, community-focused project created by the All3Rounds team to make Filipino battle rap more searchable and accessible for educational and archival purposes.
            </p>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Information We Collect</h2>
              
              <div className="space-y-4 pl-4 border-l-2 border-border/40">
                <h3 className="font-medium text-foreground">1. Basic Usage Data</h3>
                <p>When you use the website, some information may be automatically collected for security and functionality purposes. This may include:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>IP address</li>
                  <li>browser type</li>
                  <li>device information</li>
                  <li>pages visited</li>
                  <li>search queries performed on the site</li>
                </ul>
                <p>This information helps us improve the platform and prevent abuse.</p>
              </div>

              <div className="space-y-4 pl-4 border-l-2 border-border/40">
                <h3 className="font-medium text-foreground">2. Cookies</h3>
                <p>All3Rounds may use cookies or similar technologies for:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>authentication and login sessions (Google OAuth)</li>
                  <li>site functionality</li>
                  <li>security and rate limiting</li>
                </ul>
                <p>Cookies do not contain sensitive personal information and are used only to operate the website.</p>
              </div>

              <div className="space-y-4 pl-4 border-l-2 border-border/40">
                <h3 className="font-medium text-foreground">3. User Contributions</h3>
                <p>Users may submit suggestions or corrections to improve transcripts or site content. When submitting edits or suggestions, we may store:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>the submitted content</li>
                  <li>associated metadata needed to process the suggestion</li>
                </ul>
                <p>These submissions help improve the accuracy of the archive.</p>
              </div>

              <div className="space-y-4 pl-4 border-l-2 border-border/40">
                <h3 className="font-medium text-foreground">4. Third-Party Services</h3>
                <p>All3Rounds uses third-party services that may process limited data in order to operate the platform:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Vercel</strong> – website hosting and infrastructure</li>
                  <li><strong>Supabase</strong> – database and backend services</li>
                  <li><strong>Cloudflare</strong> – content delivery network and security</li>
                  <li><strong>Upstash Redis</strong> – caching and rate limiting</li>
                  <li><strong>Google OAuth</strong> – authentication</li>
                  <li><strong>YouTube</strong> – embedded video content</li>
                </ul>
                <p>These services may collect technical information according to their own privacy policies.</p>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Embedded Content</h2>
              <p>All3Rounds includes embedded or linked content from YouTube. When viewing embedded videos, YouTube may collect data according to YouTube&apos;s own privacy policies. All3Rounds does not control how YouTube processes this data.</p>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">How We Use Information</h2>
              <p>Information collected may be used to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>operate and maintain the website</li>
                <li>improve search and content accuracy</li>
                <li>prevent abuse and spam</li>
                <li>process suggested edits or feedback</li>
              </ul>
              <p>We do not sell or rent personal information.</p>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Data Retention</h2>
              <p>We retain only the data necessary to operate the service and maintain the archive. Users may request removal of contributed content by contacting us.</p>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Data Removal Requests</h2>
              <p>If you would like to request removal of submitted content or have privacy concerns, you may contact us via email. Requests will be reviewed and addressed when reasonably possible.</p>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Children&apos;s Privacy</h2>
              <p>All3Rounds is intended for users 13 years and older. We do not knowingly collect personal information from children under 13.</p>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Changes to This Policy</h2>
              <p>This Privacy Policy may be updated as the project evolves. Updates will be reflected on this page.</p>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Contact</h2>
              <p>For privacy questions or data requests, please contact:</p>
              <p className="font-medium text-foreground">
                All3Rounds Team<br />
                Email: team@all3rounds.com
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
