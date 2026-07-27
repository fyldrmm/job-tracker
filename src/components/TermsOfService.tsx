interface TermsOfServiceProps {
  onBack: () => void
}

// Generated via Termly's Terms and Conditions Generator (2026-07-27), then
// reviewed and corrected before publishing -- fixed the unfilled address
// placeholder + incorrect "a company" framing (Fatih Yildirim operates
// individually, not through a registered company), added the price-
// grandfathering commitment that's already live on the pricing page but was
// missing from the generator's output, rewrote the self-contradictory User
// Generated Contributions section (it said "we don't offer this" then
// described one anyway), rewrote Reviews to reflect that Feedback is
// private and never published (the generator wrote it as a public,
// broadcast-licensed review system), and replaced Social Media with a
// plain "not offered yet" placeholder since Google sign-in isn't built --
// the generated section described full social-graph/friend-list sync, far
// beyond what plain OAuth sign-in will ever need once it ships.
//
// Known open item NOT covered by the fixes above: Section 10 (Contribution
// License) still talks about "Contributions" as an ongoing, plural thing,
// which sits oddly against Section 9's "we don't offer this" -- not fixed
// here since it wasn't part of the agreed fix list; revisit together with
// whoever next edits this page.
export function TermsOfService({ onBack }: TermsOfServiceProps) {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <button
        type="button"
        onClick={onBack}
        className="text-sm font-medium text-ink-600 hover:text-ink-800 mb-4"
      >
        ← Back to board
      </button>

      <div className="max-w-2xl space-y-4 text-sm text-ink-700">
        <h2 className="text-lg font-medium text-ink-800">Terms of Service</h2>
        <p className="text-xs text-ink-400">Last updated: July 27, 2026</p>

        <h3 className="font-medium text-ink-800 pt-2">Agreement to our legal terms</h3>
        <p>
          We are Fatih Yildirim, doing business as OfferTrail ("Company," "we," "us," "our"), an individual
          operating in Bucharest, Romania.
        </p>
        <p>
          We operate the website offertrail.app (the "Site"), as well as any other related products and
          services that refer or link to these legal terms (the "Legal Terms") (collectively, the
          "Services").
        </p>
        <p>
          OfferTrail is a job-application tracking tool with a free tier (Kanban board, manual entry,
          archive, interview tracking, and calendar export) and an optional paid Pro subscription (higher
          AI-extraction limits and XLSX/CSV export).
        </p>
        <p>You can contact us by email at fazare@fazare.dev.</p>
        <p>
          These Legal Terms constitute a legally binding agreement made between you, whether personally or
          on behalf of an entity ("you"), and Fatih Yildirim, concerning your access to and use of the
          Services. You agree that by accessing the Services, you have read, understood, and agreed to be
          bound by all of these Legal Terms. IF YOU DO NOT AGREE WITH ALL OF THESE LEGAL TERMS, THEN YOU
          ARE EXPRESSLY PROHIBITED FROM USING THE SERVICES AND YOU MUST DISCONTINUE USE IMMEDIATELY.
        </p>
        <p>
          Supplemental terms and conditions or documents that may be posted on the Services from time to
          time are hereby expressly incorporated herein by reference. We reserve the right, in our sole
          discretion, to make changes or modifications to these Legal Terms from time to time. We will
          alert you about any changes by updating the "Last updated" date of these Legal Terms, and you
          waive any right to receive specific notice of each such change. It is your responsibility to
          periodically review these Legal Terms to stay informed of updates. You will be subject to, and
          will be deemed to have been made aware of and to have accepted, the changes in any revised Legal
          Terms by your continued use of the Services after the date such revised Legal Terms are posted.
        </p>
        <p>
          The Services are intended for users who are at least 18 years old. Persons under the age of 18
          are not permitted to use or register for the Services.
        </p>
        <p>We recommend that you print a copy of these Legal Terms for your records.</p>

        <h3 className="font-medium text-ink-800 pt-2">1. Our services</h3>
        <p>
          The information provided when using the Services is not intended for distribution to or use by
          any person or entity in any jurisdiction or country where such distribution or use would be
          contrary to law or regulation or which would subject us to any registration requirement within
          such jurisdiction or country. Accordingly, those persons who choose to access the Services from
          other locations do so on their own initiative and are solely responsible for compliance with
          local laws, if and to the extent local laws are applicable.
        </p>
        <p>
          The Services are not tailored to comply with industry-specific regulations (Health Insurance
          Portability and Accountability Act (HIPAA), Federal Information Security Management Act (FISMA),
          etc.), so if your interactions would be subjected to such laws, you may not use the Services. You
          may not use the Services in a way that would violate the Gramm-Leach-Bliley Act (GLBA).
        </p>

        <h3 className="font-medium text-ink-800 pt-2">2. Intellectual property rights</h3>
        <p>
          <strong>Our intellectual property.</strong> We are the owner or the licensee of all intellectual
          property rights in our Services, including all source code, databases, functionality, software,
          website designs, audio, video, text, photographs, and graphics in the Services (collectively, the
          "Content"), as well as the trademarks, service marks, and logos contained therein (the "Marks").
        </p>
        <p>
          Our Content and Marks are protected by copyright and trademark laws (and various other
          intellectual property rights and unfair competition laws) and treaties around the world.
        </p>
        <p>The Content and Marks are provided in or through the Services "AS IS" for your personal, non-commercial use only.</p>
        <p>
          <strong>Your use of our Services.</strong> Subject to your compliance with these Legal Terms,
          including the "Prohibited activities" section below, we grant you a non-exclusive,
          non-transferable, revocable license to: access the Services; and download or print a copy of any
          portion of the Content to which you have properly gained access, solely for your personal,
          non-commercial use.
        </p>
        <p>
          Except as set out in this section or elsewhere in our Legal Terms, no part of the Services and no
          Content or Marks may be copied, reproduced, aggregated, republished, uploaded, posted, publicly
          displayed, encoded, translated, transmitted, distributed, sold, licensed, or otherwise exploited
          for any commercial purpose whatsoever, without our express prior written permission.
        </p>
        <p>
          If you wish to make any use of the Services, Content, or Marks other than as set out in this
          section or elsewhere in our Legal Terms, please address your request to fazare@fazare.dev. If we
          ever grant you the permission to post, reproduce, or publicly display any part of our Services or
          Content, you must identify us as the owners or licensors of the Services, Content, or Marks and
          ensure that any copyright or proprietary notice appears or is visible on posting, reproducing, or
          displaying our Content.
        </p>
        <p>We reserve all rights not expressly granted to you in and to the Services, Content, and Marks.</p>
        <p>
          Any breach of these Intellectual Property Rights will constitute a material breach of our Legal
          Terms and your right to use our Services will terminate immediately.
        </p>
        <p>
          <strong>Your submissions.</strong> Please review this section and the "Prohibited activities"
          section carefully prior to using our Services to understand the (a) rights you give us and (b)
          obligations you have when you post or upload any content through the Services.
        </p>
        <p>
          Submissions: by directly sending us any question, comment, suggestion, idea, feedback, or other
          information about the Services ("Submissions"), you agree to assign to us all intellectual
          property rights in such Submission. You agree that we shall own this Submission and be entitled
          to its unrestricted use and dissemination for any lawful purpose, commercial or otherwise,
          without acknowledgment or compensation to you.
        </p>
        <p>You are responsible for what you post or upload. By sending us Submissions through any part of the Services you:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            confirm that you have read and agree with our "Prohibited activities" and will not post, send,
            publish, upload, or transmit through the Services any Submission that is illegal, harassing,
            hateful, harmful, defamatory, obscene, bullying, abusive, discriminatory, threatening to any
            person or group, sexually explicit, false, inaccurate, deceitful, or misleading;
          </li>
          <li>to the extent permissible by applicable law, waive any and all moral rights to any such Submission;</li>
          <li>
            warrant that any such Submission are original to you or that you have the necessary rights and
            licenses to submit such Submissions and that you have full authority to grant us the
            above-mentioned rights in relation to your Submissions; and
          </li>
          <li>warrant and represent that your Submissions do not constitute confidential information.</li>
        </ul>
        <p>
          You are solely responsible for your Submissions and you expressly agree to reimburse us for any
          and all losses that we may suffer because of your breach of (a) this section, (b) any third
          party's intellectual property rights, or (c) applicable law.
        </p>

        <h3 className="font-medium text-ink-800 pt-2">3. User representations</h3>
        <p>
          By using the Services, you represent and warrant that: (1) all registration information you
          submit will be true, accurate, current, and complete; (2) you will maintain the accuracy of such
          information and promptly update such registration information as necessary; (3) you have the
          legal capacity and you agree to comply with these Legal Terms; (4) you are not a minor in the
          jurisdiction in which you reside; (5) you will not access the Services through automated or
          non-human means, whether through a bot, script or otherwise; (6) you will not use the Services
          for any illegal or unauthorized purpose; and (7) your use of the Services will not violate any
          applicable law or regulation.
        </p>
        <p>
          If you provide any information that is untrue, inaccurate, not current, or incomplete, we have
          the right to suspend or terminate your account and refuse any and all current or future use of
          the Services (or any portion thereof).
        </p>

        <h3 className="font-medium text-ink-800 pt-2">4. User registration</h3>
        <p>
          You may be required to register to use the Services. You agree to keep your password confidential
          and will be responsible for all use of your account and password. We reserve the right to remove,
          reclaim, or change a username you select if we determine, in our sole discretion, that such
          username is inappropriate, obscene, or otherwise objectionable.
        </p>

        <h3 className="font-medium text-ink-800 pt-2">5. Purchases and payment</h3>
        <p>We accept the following forms of payment: Visa, Mastercard, American Express, and Discover.</p>
        <p>
          You agree to provide current, complete, and accurate purchase and account information for all
          purchases made via the Services. You further agree to promptly update account and payment
          information, including email address, payment method, and payment card expiration date, so that
          we can complete your transactions and contact you as needed. Sales tax will be added to the price
          of purchases as deemed required by us. We may change prices for new subscribers at any time. If
          you are already subscribed, your price will remain the same for as long as you keep your
          subscription active without interruption. All payments shall be in US dollars or euros, depending
          on the customer's location.
        </p>
        <p>
          You agree to pay all charges at the prices then in effect for your purchases, and you authorize
          us to charge your chosen payment provider for any such amounts upon placing your order. We
          reserve the right to correct any errors or mistakes in pricing, even if we have already requested
          or received payment.
        </p>
        <p>
          We reserve the right to refuse any order placed through the Services. We may, in our sole
          discretion, limit or cancel quantities purchased per person, per household, or per order. These
          restrictions may include orders placed by or under the same customer account, the same payment
          method, and/or orders that use the same billing address. We reserve the right to limit or
          prohibit orders that, in our sole judgment, appear to be placed by dealers, resellers, or
          distributors.
        </p>

        <h3 className="font-medium text-ink-800 pt-2">6. Subscriptions</h3>
        <p>
          <strong>Billing and renewal.</strong> Your subscription will continue and automatically renew
          unless canceled. You consent to our charging your payment method on a recurring basis without
          requiring your prior approval for each recurring charge, until such time as you cancel the
          applicable order. The length of your billing cycle is monthly or quarterly (customer's choice).
        </p>
        <p>
          <strong>Cancellation.</strong> You can cancel your subscription at any time by logging into your
          account, opening Account settings, and selecting "Manage billing." This opens Stripe's secure
          billing portal, where you can cancel. Cancellation takes effect at the end of your current billing
          period — you keep Pro access until then and are not charged again afterward. Canceling does not
          automatically issue a refund for the current period. If you are eligible for a refund (14 days to
          request one after your first payment, 7 days after each renewal, provided 5 or fewer AI
          extractions were used), you must separately email us to request it. If you have any questions or
          are unsatisfied with our Services, please email us at fazare@fazare.dev.
        </p>
        <p>
          <strong>Fee changes.</strong> We may, from time to time, change the subscription fee for new
          subscribers. If you are already subscribed at a given price, that price will not change for as
          long as you keep your subscription active without interruption. If you cancel and re-subscribe
          later, the then-current price will apply. We will communicate any price changes in accordance
          with applicable law.
        </p>

        <h3 className="font-medium text-ink-800 pt-2">7. Software</h3>
        <p>
          We may include software for use in connection with our Services. If such software is accompanied
          by an end user license agreement ("EULA"), the terms of the EULA will govern your use of the
          software. If such software is not accompanied by a EULA, then we grant to you a non-exclusive,
          revocable, personal, and non-transferable license to use such software solely in connection with
          our services and in accordance with these Legal Terms. Any software and any related documentation
          is provided "AS IS" without warranty of any kind, either express or implied, including, without
          limitation, the implied warranties of merchantability, fitness for a particular purpose, or
          non-infringement. You accept any and all risk arising out of use or performance of any software.
          You may not reproduce or redistribute any software except in accordance with the EULA or these
          Legal Terms.
        </p>

        <h3 className="font-medium text-ink-800 pt-2">8. Prohibited activities</h3>
        <p>
          You may not access or use the Services for any purpose other than that for which we make the
          Services available. The Services may not be used in connection with any commercial endeavors
          except those that are specifically endorsed or approved by us. As a user of the Services, you
          agree not to:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Systematically retrieve data or other content from the Services to create or compile, directly or indirectly, a collection, compilation, database, or directory without written permission from us.</li>
          <li>Trick, defraud, or mislead us and other users, especially in any attempt to learn sensitive account information such as user passwords.</li>
          <li>Circumvent, disable, or otherwise interfere with security-related features of the Services.</li>
          <li>Disparage, tarnish, or otherwise harm, in our opinion, us and/or the Services.</li>
          <li>Use any information obtained from the Services in order to harass, abuse, or harm another person.</li>
          <li>Make improper use of our support services or submit false reports of abuse or misconduct.</li>
          <li>Use the Services in a manner inconsistent with any applicable laws or regulations.</li>
          <li>Engage in unauthorized framing of or linking to the Services.</li>
          <li>Upload or transmit (or attempt to upload or to transmit) viruses, Trojan horses, or other material that interferes with any party's uninterrupted use and enjoyment of the Services or modifies, impairs, disrupts, alters, or interferes with the use, features, functions, operation, or maintenance of the Services.</li>
          <li>Engage in any automated use of the system, such as using scripts to send comments or messages, or using any data mining, robots, or similar data gathering and extraction tools.</li>
          <li>Delete the copyright or other proprietary rights notice from any Content.</li>
          <li>Attempt to impersonate another user or person or use the username of another user.</li>
          <li>Upload or transmit (or attempt to upload or to transmit) any material that acts as a passive or active information collection or transmission mechanism.</li>
          <li>Interfere with, disrupt, or create an undue burden on the Services or the networks or services connected to the Services.</li>
          <li>Harass, annoy, intimidate, or threaten any of our employees or agents engaged in providing any portion of the Services to you.</li>
          <li>Attempt to bypass any measures of the Services designed to prevent or restrict access to the Services, or any portion of the Services.</li>
          <li>Copy or adapt the Services' software, including but not limited to Flash, PHP, HTML, JavaScript, or other code.</li>
          <li>Except as permitted by applicable law, decipher, decompile, disassemble, or reverse engineer any of the software comprising or in any way making up a part of the Services.</li>
          <li>Except as may be the result of standard search engine or Internet browser usage, use, launch, develop, or distribute any automated system, including without limitation, any spider, robot, cheat utility, scraper, or offline reader that accesses the Services, or use or launch any unauthorized script or other software.</li>
          <li>Use a buying agent or purchasing agent to make purchases on the Services.</li>
          <li>Make any unauthorized use of the Services, including collecting usernames and/or email addresses of users by electronic or other means for the purpose of sending unsolicited email, or creating user accounts by automated means or under false pretenses.</li>
          <li>Use the Services as part of any effort to compete with us or otherwise use the Services and/or the Content for any revenue-generating endeavor or commercial enterprise.</li>
          <li>Use the Services to advertise or offer to sell goods and services.</li>
          <li>Attempt to bypass or circumvent the AI-extraction usage limits or Free/Pro entitlement checks.</li>
          <li>Submit content to the AI-extraction feature that is designed to manipulate or attack the underlying AI model (e.g., prompt injection attempts).</li>
          <li>Use automated tools, scripts, or scraping to extract data from the Service beyond normal single-use browser-extension operation.</li>
          <li>Access or attempt to access another user's account or data without authorization.</li>
          <li>Use the Service for any purpose other than tracking and managing your own job search activities.</li>
          <li>Create multiple accounts to circumvent usage limits, quotas, or free-tier restrictions.</li>
          <li>Use a stolen, unauthorized, or fraudulent payment method, or initiate a chargeback in bad faith for a service actually received.</li>
          <li>Upload files containing malware, or files disguised as images that attempt to exploit our systems, through the AI-extraction upload feature.</li>
          <li>Interfere with, disrupt, or attempt to overload the Service's infrastructure, including automated requests designed to exhaust the AI-extraction quota or drive up processing costs.</li>
        </ul>

        <h3 className="font-medium text-ink-800 pt-2">9. User generated contributions</h3>
        <p>
          The Services do not offer users the ability to submit or post content that is shared with, or
          made visible to, other users or the public. The only exception is optional feedback you may
          submit to us directly (see Section 11), which is private and viewed only by us.
        </p>

        <h3 className="font-medium text-ink-800 pt-2">10. Contribution license</h3>
        <p>
          You and Services agree that we may access, store, process, and use any information and personal
          data that you provide following the terms of the Privacy Policy and your choices (including
          settings). By submitting suggestions or other feedback regarding the Services, you agree that we
          can use and share such feedback for any purpose without compensation to you. We do not assert any
          ownership over your Contributions. You retain full ownership of all of your Contributions and any
          intellectual property rights or other proprietary rights associated with your Contributions. We
          are not liable for any statements or representations in your Contributions provided by you in any
          area on the Services. You are solely responsible for your Contributions to the Services and you
          expressly agree to exonerate us from any and all responsibility and to refrain from any legal
          action against us regarding your Contributions.
        </p>

        <h3 className="font-medium text-ink-800 pt-2">11. Feedback</h3>
        <p>
          We may provide you with the option to submit private feedback about the Services, including a
          star rating and an optional written comment. This feedback is not published, displayed to other
          users, or made public in any way — it is visible only to us, for the purpose of improving the
          Services. By submitting feedback, you agree that we may use it internally without compensation to
          you. We do not assume any obligation to act on any feedback submitted.
        </p>

        <h3 className="font-medium text-ink-800 pt-2">12. Third-party sign-in</h3>
        <p>
          The Services do not currently offer the ability to link your account with third-party social
          media accounts. If this changes in the future, this section will be updated to describe exactly
          what data is accessed and how.
        </p>

        <h3 className="font-medium text-ink-800 pt-2">13. Third-party websites and content</h3>
        <p>
          The Services may contain (or you may be sent via the Site) links to other websites ("Third-Party
          Websites") as well as content or items belonging to or originating from third parties
          ("Third-Party Content"). Such Third-Party Websites and Third-Party Content are not investigated,
          monitored, or checked for accuracy, appropriateness, or completeness by us, and we are not
          responsible for any Third-Party Websites accessed through the Services or any Third-Party Content
          posted on, available through, or installed from the Services, including the content, accuracy,
          offensiveness, opinions, reliability, privacy practices, or other policies of or contained in the
          Third-Party Websites or the Third-Party Content. Inclusion of, linking to, or permitting the use
          or installation of any Third-Party Websites or any Third-Party Content does not imply approval or
          endorsement thereof by us. If you decide to leave the Services and access the Third-Party
          Websites or to use or install any Third-Party Content, you do so at your own risk, and you should
          be aware these Legal Terms no longer govern. You should review the applicable terms and policies
          of any website to which you navigate from the Services. Any purchases you make through
          Third-Party Websites will be through other websites and from other companies, and we take no
          responsibility whatsoever in relation to such purchases which are exclusively between you and the
          applicable third party. You agree and acknowledge that we do not endorse the products or services
          offered on Third-Party Websites and you shall hold us blameless from any harm caused by your
          purchase of such products or services, or relating to or resulting in any way from any
          Third-Party Content or any contact with Third-Party Websites.
        </p>

        <h3 className="font-medium text-ink-800 pt-2">14. Services management</h3>
        <p>
          We reserve the right, but not the obligation, to: (1) monitor the Services for violations of
          these Legal Terms; (2) take appropriate legal action against anyone who, in our sole discretion,
          violates the law or these Legal Terms; (3) in our sole discretion and without limitation, refuse,
          restrict access to, limit the availability of, or disable any of your Contributions or any
          portion thereof; (4) in our sole discretion and without limitation, notice, or liability, to
          remove from the Services or otherwise disable all files and content that are excessive in size or
          are in any way burdensome to our systems; and (5) otherwise manage the Services in a manner
          designed to protect our rights and property and to facilitate the proper functioning of the
          Services.
        </p>

        <h3 className="font-medium text-ink-800 pt-2">15. Privacy policy</h3>
        <p>
          We care about data privacy and security. Please review our{' '}
          <a href="/privacy" className="text-ink-800 underline hover:text-ink-600">
            Privacy Policy
          </a>
          . By using the Services, you agree to be bound by our Privacy Policy, which is incorporated into
          these Legal Terms. Please be advised the Services are hosted in France. If you access the
          Services from any other region of the world with laws or other requirements governing personal
          data collection, use, or disclosure that differ from applicable laws in France, then through your
          continued use of the Services, you are transferring your data to France, and you expressly
          consent to have your data transferred to and processed in France.
        </p>

        <h3 className="font-medium text-ink-800 pt-2">16. Term and termination</h3>
        <p>
          These Legal Terms shall remain in full force and effect while you use the Services. WITHOUT
          LIMITING ANY OTHER PROVISION OF THESE LEGAL TERMS, WE RESERVE THE RIGHT TO, IN OUR SOLE
          DISCRETION AND WITHOUT NOTICE OR LIABILITY, DENY ACCESS TO AND USE OF THE SERVICES (INCLUDING
          BLOCKING CERTAIN IP ADDRESSES), TO ANY PERSON FOR ANY REASON OR FOR NO REASON, INCLUDING WITHOUT
          LIMITATION FOR BREACH OF ANY REPRESENTATION, WARRANTY, OR COVENANT CONTAINED IN THESE LEGAL TERMS
          OR OF ANY APPLICABLE LAW OR REGULATION. WE MAY TERMINATE YOUR USE OR PARTICIPATION IN THE
          SERVICES OR DELETE YOUR ACCOUNT AND ANY CONTENT OR INFORMATION THAT YOU POSTED AT ANY TIME,
          WITHOUT WARNING, IN OUR SOLE DISCRETION.
        </p>
        <p>
          If we terminate or suspend your account for any reason, you are prohibited from registering and
          creating a new account under your name, a fake or borrowed name, or the name of any third party,
          even if you may be acting on behalf of the third party. In addition to terminating or suspending
          your account, we reserve the right to take appropriate legal action, including without limitation
          pursuing civil, criminal, and injunctive redress.
        </p>

        <h3 className="font-medium text-ink-800 pt-2">17. Modifications and interruptions</h3>
        <p>
          We reserve the right to change, modify, or remove the contents of the Services at any time or for
          any reason at our sole discretion without notice. However, we have no obligation to update any
          information on our Services. We will not be liable to you or any third party for any
          modification, price change, suspension, or discontinuance of the Services.
        </p>
        <p>
          We cannot guarantee the Services will be available at all times. We may experience hardware,
          software, or other problems or need to perform maintenance related to the Services, resulting in
          interruptions, delays, or errors. We reserve the right to change, revise, update, suspend,
          discontinue, or otherwise modify the Services at any time or for any reason without notice to
          you. You agree that we have no liability whatsoever for any loss, damage, or inconvenience caused
          by your inability to access or use the Services during any downtime or discontinuance of the
          Services. Nothing in these Legal Terms will be construed to obligate us to maintain and support
          the Services or to supply any corrections, updates, or releases in connection therewith.
        </p>

        <h3 className="font-medium text-ink-800 pt-2">18. Governing law</h3>
        <p>
          These Legal Terms are governed by and interpreted following the laws of Romania, and the use of
          the United Nations Convention of Contracts for the International Sales of Goods is expressly
          excluded. If your habitual residence is in the EU, and you are a consumer, you additionally
          possess the protection provided to you by obligatory provisions of the law in your country of
          residence. Fatih Yildirim and yourself both agree to submit to the non-exclusive jurisdiction of
          the courts of Bucharest, which means that you may make a claim to defend your consumer protection
          rights in regards to these Legal Terms in Romania, or in the EU country in which you reside.
        </p>

        <h3 className="font-medium text-ink-800 pt-2">19. Dispute resolution</h3>
        <p>
          The European Commission provides information on consumer redress, including a list of dispute
          resolution bodies by country, which you can access. If you would like to bring this subject to
          our attention, please contact us.
        </p>

        <h3 className="font-medium text-ink-800 pt-2">20. Corrections</h3>
        <p>
          There may be information on the Services that contains typographical errors, inaccuracies, or
          omissions, including descriptions, pricing, availability, and various other information. We
          reserve the right to correct any errors, inaccuracies, or omissions and to change or update the
          information on the Services at any time, without prior notice.
        </p>

        <h3 className="font-medium text-ink-800 pt-2">21. Disclaimer</h3>
        <p>
          THE SERVICES ARE PROVIDED ON AN AS-IS AND AS-AVAILABLE BASIS. YOU AGREE THAT YOUR USE OF THE
          SERVICES WILL BE AT YOUR SOLE RISK. TO THE FULLEST EXTENT PERMITTED BY LAW, WE DISCLAIM ALL
          WARRANTIES, EXPRESS OR IMPLIED, IN CONNECTION WITH THE SERVICES AND YOUR USE THEREOF, INCLUDING,
          WITHOUT LIMITATION, THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
          AND NON-INFRINGEMENT. WE MAKE NO WARRANTIES OR REPRESENTATIONS ABOUT THE ACCURACY OR COMPLETENESS
          OF THE SERVICES' CONTENT AND WE WILL ASSUME NO LIABILITY OR RESPONSIBILITY FOR ANY (1) ERRORS,
          MISTAKES, OR INACCURACIES OF CONTENT AND MATERIALS, (2) PERSONAL INJURY OR PROPERTY DAMAGE, OF
          ANY NATURE WHATSOEVER, RESULTING FROM YOUR ACCESS TO AND USE OF THE SERVICES, (3) ANY UNAUTHORIZED
          ACCESS TO OR USE OF OUR SECURE SERVERS AND/OR ANY AND ALL PERSONAL INFORMATION AND/OR FINANCIAL
          INFORMATION STORED THEREIN, (4) ANY INTERRUPTION OR CESSATION OF TRANSMISSION TO OR FROM THE
          SERVICES, (5) ANY BUGS, VIRUSES, TROJAN HORSES, OR THE LIKE WHICH MAY BE TRANSMITTED TO OR THROUGH
          THE SERVICES BY ANY THIRD PARTY, AND/OR (6) ANY ERRORS OR OMISSIONS IN ANY CONTENT AND MATERIALS
          OR FOR ANY LOSS OR DAMAGE OF ANY KIND INCURRED AS A RESULT OF THE USE OF ANY CONTENT POSTED,
          TRANSMITTED, OR OTHERWISE MADE AVAILABLE VIA THE SERVICES. WE DO NOT WARRANT, ENDORSE, GUARANTEE,
          OR ASSUME RESPONSIBILITY FOR ANY PRODUCT OR SERVICE ADVERTISED OR OFFERED BY A THIRD PARTY THROUGH
          THE SERVICES, ANY HYPERLINKED WEBSITE, OR ANY WEBSITE OR MOBILE APPLICATION FEATURED IN ANY BANNER
          OR OTHER ADVERTISING, AND WE WILL NOT BE A PARTY TO OR IN ANY WAY BE RESPONSIBLE FOR MONITORING
          ANY TRANSACTION BETWEEN YOU AND ANY THIRD-PARTY PROVIDERS OF PRODUCTS OR SERVICES. AS WITH THE
          PURCHASE OF A PRODUCT OR SERVICE THROUGH ANY MEDIUM OR IN ANY ENVIRONMENT, YOU SHOULD USE YOUR
          BEST JUDGMENT AND EXERCISE CAUTION WHERE APPROPRIATE.
        </p>

        <h3 className="font-medium text-ink-800 pt-2">22. Limitations of liability</h3>
        <p>
          IN NO EVENT WILL WE OR OUR DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE TO YOU OR ANY THIRD PARTY FOR
          ANY DIRECT, INDIRECT, CONSEQUENTIAL, EXEMPLARY, INCIDENTAL, SPECIAL, OR PUNITIVE DAMAGES,
          INCLUDING LOST PROFIT, LOST REVENUE, LOSS OF DATA, OR OTHER DAMAGES ARISING FROM YOUR USE OF THE
          SERVICES, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. NOTWITHSTANDING
          ANYTHING TO THE CONTRARY CONTAINED HEREIN, OUR LIABILITY TO YOU FOR ANY CAUSE WHATSOEVER AND
          REGARDLESS OF THE FORM OF THE ACTION, WILL AT ALL TIMES BE LIMITED TO THE LESSER OF THE AMOUNT
          PAID, IF ANY, BY YOU TO US DURING THE SIX (6) MONTH PERIOD PRIOR TO ANY CAUSE OF ACTION ARISING OR
          $100.00 USD. CERTAIN US STATE LAWS AND INTERNATIONAL LAWS DO NOT ALLOW LIMITATIONS ON IMPLIED
          WARRANTIES OR THE EXCLUSION OR LIMITATION OF CERTAIN DAMAGES. IF THESE LAWS APPLY TO YOU, SOME OR
          ALL OF THE ABOVE DISCLAIMERS OR LIMITATIONS MAY NOT APPLY TO YOU, AND YOU MAY HAVE ADDITIONAL
          RIGHTS.
        </p>

        <h3 className="font-medium text-ink-800 pt-2">23. Indemnification</h3>
        <p>
          You agree to defend, indemnify, and hold us harmless, including our respective officers, agents,
          partners, and employees, from and against any loss, damage, liability, claim, or demand, including
          reasonable attorneys' fees and expenses, made by any third party due to or arising out of: (1) use
          of the Services; (2) breach of these Legal Terms; (3) any breach of your representations and
          warranties set forth in these Legal Terms; (4) your violation of the rights of a third party,
          including but not limited to intellectual property rights; or (5) any overt harmful act toward
          any other user of the Services with whom you connected via the Services. Notwithstanding the
          foregoing, we reserve the right, at your expense, to assume the exclusive defense and control of
          any matter for which you are required to indemnify us, and you agree to cooperate, at your
          expense, with our defense of such claims. We will use reasonable efforts to notify you of any
          such claim, action, or proceeding which is subject to this indemnification upon becoming aware of
          it.
        </p>

        <h3 className="font-medium text-ink-800 pt-2">24. User data</h3>
        <p>
          We will maintain certain data that you transmit to the Services for the purpose of managing the
          performance of the Services, as well as data relating to your use of the Services. Although we
          perform regular routine backups of data, you are solely responsible for all data that you
          transmit or that relates to any activity you have undertaken using the Services. You agree that
          we shall have no liability to you for any loss or corruption of any such data, and you hereby
          waive any right of action against us arising from any such loss or corruption of such data.
        </p>

        <h3 className="font-medium text-ink-800 pt-2">25. Electronic communications, transactions, and signatures</h3>
        <p>
          Visiting the Services, sending us emails, and completing online forms constitute electronic
          communications. You consent to receive electronic communications, and you agree that all
          agreements, notices, disclosures, and other communications we provide to you electronically, via
          email and on the Services, satisfy any legal requirement that such communication be in writing.
          YOU HEREBY AGREE TO THE USE OF ELECTRONIC SIGNATURES, CONTRACTS, ORDERS, AND OTHER RECORDS, AND TO
          ELECTRONIC DELIVERY OF NOTICES, POLICIES, AND RECORDS OF TRANSACTIONS INITIATED OR COMPLETED BY US
          OR VIA THE SERVICES. You hereby waive any rights or requirements under any statutes, regulations,
          rules, ordinances, or other laws in any jurisdiction which require an original signature or
          delivery or retention of non-electronic records, or to payments or the granting of credits by any
          means other than electronic means.
        </p>

        <h3 className="font-medium text-ink-800 pt-2">26. California users and residents</h3>
        <p>
          If any complaint with us is not satisfactorily resolved, you can contact the Complaint Assistance
          Unit of the Division of Consumer Services of the California Department of Consumer Affairs in
          writing at 1625 North Market Blvd., Suite N 112, Sacramento, California 95834 or by telephone at
          (800) 952-5210 or (916) 445-1254.
        </p>

        <h3 className="font-medium text-ink-800 pt-2">27. Miscellaneous</h3>
        <p>
          These Legal Terms and any policies or operating rules posted by us on the Services or in respect
          to the Services constitute the entire agreement and understanding between you and us. Our failure
          to exercise or enforce any right or provision of these Legal Terms shall not operate as a waiver
          of such right or provision. These Legal Terms operate to the fullest extent permissible by law.
          We may assign any or all of our rights and obligations to others at any time. We shall not be
          responsible or liable for any loss, damage, delay, or failure to act caused by any cause beyond
          our reasonable control. If any provision or part of a provision of these Legal Terms is
          determined to be unlawful, void, or unenforceable, that provision or part of the provision is
          deemed severable from these Legal Terms and does not affect the validity and enforceability of
          any remaining provisions. There is no joint venture, partnership, employment or agency
          relationship created between you and us as a result of these Legal Terms or use of the Services.
          You agree that these Legal Terms will not be construed against us by virtue of having drafted
          them. You hereby waive any and all defenses you may have based on the electronic form of these
          Legal Terms and the lack of signing by the parties hereto to execute these Legal Terms.
        </p>

        <h3 className="font-medium text-ink-800 pt-2">28. AI-extraction accuracy disclaimer</h3>
        <p>
          The AI-extraction feature (screenshot upload and browser extension) uses a third-party AI model
          to read job-posting details and pre-fill form fields. Extracted data is not guaranteed to be
          accurate, and you should review and correct it before saving. We are not responsible for
          decisions made based on incorrect AI-extracted data.
        </p>

        <h3 className="font-medium text-ink-800 pt-2">29. Outcome disclaimer</h3>
        <p>
          OfferTrail is a tracking tool only. It does not guarantee interviews, offers, or employment
          outcomes, and does not constitute career, legal, or employment advice.
        </p>

        <h3 className="font-medium text-ink-800 pt-2">30. Contact us</h3>
        <p>
          In order to resolve a complaint regarding the Services or to receive further information
          regarding use of the Services, please contact us at:
        </p>
        <p>
          Fatih Yildirim
          <br />
          Bucharest, Romania
          <br />
          <a href="mailto:fazare@fazare.dev" className="text-ink-800 underline hover:text-ink-600">
            fazare@fazare.dev
          </a>
        </p>

        <p className="text-xs text-ink-400 pt-4">
          This Terms of Service was created using Termly's Terms and Conditions Generator, then reviewed
          and corrected before publishing.
        </p>
      </div>
    </div>
  )
}
