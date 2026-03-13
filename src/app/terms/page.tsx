import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Terms of Service — All3Rounds",
  description: "Terms of Service for All3Rounds - The Filipino Battle Rap Archive.",
};

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      
      <main className="mx-auto flex-1 w-full max-w-4xl px-6 py-12 md:py-20">
        <div className="space-y-12">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl text-foreground">Terms of Service</h1>
            <p className="text-sm text-muted-foreground font-medium">Last updated: March 2026</p>
          </div>

          <div className="prose prose-invert prose-yellow max-w-none space-y-6 text-muted-foreground leading-relaxed">
            <p>Welcome to All3Rounds. By accessing <a href="https://all3rounds.com" className="text-foreground underline underline-offset-4 hover:text-yellow-400 transition-colors">all3rounds.com</a>, you agree to the following terms.</p>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">About the Project</h2>
              <p>All3Rounds is a non-profit, educational, and community-driven archive designed to make Filipino battle rap content more searchable and accessible. The project is operated by the All3Rounds team.</p>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Content Ownership</h2>
              <p>All3Rounds does not own the original battle rap videos referenced on the platform. All battle videos remain the property of their respective owners and leagues. The website links to or embeds videos from official YouTube sources, including but not limited to battle rap leagues. Views and traffic are directed to the original content source.</p>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">No Affiliation</h2>
              <p>All3Rounds is an independent fan-made project. It is not affiliated with, endorsed by, or officially connected to FlipTop Battle League or any other battle rap league. All trademarks, names, and content belong to their respective owners.</p>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Accuracy of Transcriptions</h2>
              <p>Some transcripts or lines on the site may be AI-generated or community-submitted. Because of this, content may contain errors or inaccuracies. Users should treat transcripts as informational references, not official transcripts.</p>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">User Contributions</h2>
              <p>Users may submit corrections, suggestions, or edits to help improve the archive. By submitting content, you grant All3Rounds permission to use, edit, publish, or display the submitted material as part of the platform.</p>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Acceptable Use</h2>
              <p>Users agree not to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>attempt to disrupt or abuse the platform</li>
                <li>scrape or extract large amounts of data without permission</li>
                <li>bypass rate limits or security protections</li>
                <li>submit malicious or harmful content</li>
              </ul>
              <p>Violation of these terms may result in restricted access.</p>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Service Availability</h2>
              <p>All3Rounds is a passion project and is provided “as is”. We do not guarantee uninterrupted service or complete accuracy of information. Features may change, be modified, or be removed as the project evolves.</p>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Limitation of Liability</h2>
              <p>To the fullest extent permitted by law, the All3Rounds team is not responsible for any damages resulting from use of the website.</p>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Governing Law</h2>
              <p>These terms are governed by the laws of the Republic of the Philippines.</p>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Contact</h2>
              <p>For questions regarding these terms, please contact:</p>
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
