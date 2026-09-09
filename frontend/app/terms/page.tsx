import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export default function TermsOfService() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-background">
      <Navbar />
      <main className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 w-full">
        <div className="space-y-8 text-secondary leading-relaxed">
          <div>
            <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-4">Terms of Service</h1>
            <p className="text-sm">Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
          </div>

          <section className="space-y-4">
            <h2 className="font-serif text-xl text-foreground">1. Acceptance of Terms</h2>
            <p>
              By accessing or using PassNotice (&quot;we&quot;, &quot;our&quot;, &quot;the Service&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use our Service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-serif text-xl text-foreground">2. Software Purpose; Not Legal Advice</h2>
            <p>
              <strong>PassNotice is workflow automation software, not a law firm.</strong> We provide tools to help advocates and legal professionals manage data, generate documents from templates, and automate the sending of those documents. We do not provide legal advice, legal opinions, or representation. The user remains entirely responsible for the legal accuracy, validity, and appropriateness of any notices generated and sent using our software.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-serif text-xl text-foreground">3. User Responsibilities and Acceptable Use</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Data Ownership:</strong> You retain ownership of all client data and templates you upload. You are solely responsible for ensuring you have the legal right and consent to upload and process such data through our Service.</li>
              <li><strong>Document Review:</strong> You must review all generated legal notices for accuracy before sending them. PassNotice is not liable for errors in generated documents resulting from missing data, incorrect template placeholders, or formatting issues.</li>
              <li><strong>Lawful Use:</strong> You agree to use the Service strictly in accordance with all applicable laws and regulations. You shall not use the Service for spam, harassment, extortion, or any fraudulent activity.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="font-serif text-xl text-foreground">4. Gmail Authorization and Third-Party Services</h2>
            <p>
              If you choose to connect your Gmail account, you authorize PassNotice to send emails on your behalf using the Google API. You are responsible for ensuring that your use of the email sending feature complies with Google&apos;s terms of service and applicable anti-spam legislation. You may revoke this authorization at any time by disconnecting your account within PassNotice or via your Google Account security settings.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-serif text-xl text-foreground">5. Intellectual Property</h2>
            <p>
              The Service, including its original content, features, functionality, and design, is owned by PassNotice and is protected by international copyright, trademark, and other intellectual property laws. You may not copy, modify, or distribute our software without explicit permission.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-serif text-xl text-foreground">6. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, PassNotice shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or goodwill, arising out of or in connection with your access to or use of, or inability to access or use, the Service. The Service is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis without warranties of any kind.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-serif text-xl text-foreground">7. Termination</h2>
            <p>
              We may terminate or suspend your account and access to the Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. Upon termination, your right to use the Service will immediately cease.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-serif text-xl text-foreground">8. Contact Information</h2>
            <p>
              If you have any questions about these Terms, please contact us at: <a href="mailto:hello@passnotice.com" className="text-accent hover:underline">hello@passnotice.com</a>.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
