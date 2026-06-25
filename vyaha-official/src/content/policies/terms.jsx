import { Link } from 'react-router-dom';
import {
  effectiveDate,
  businessName,
  legalEntityName,
  websiteUrl,
  legalContacts,
  governingLaw,
  registeredOffice,
  serviceAreasFormatted,
  grievanceOfficer,
  gstin,
} from '../legalConfig';
import {
  PolicyIntro,
  PolicyNote,
  LegalEntityBlock,
  ContactBlock,
  GrievanceOfficerBlock,
  MailLink,
  PolicyHubLinks,
} from '../policyComponents';
import { PolicyH2, PolicyH3, PolicyH4 } from './policyPrimitives';

export function TermsContent() {
  return (
    <>
      <p><strong>Effective date:</strong> {effectiveDate}</p>

      <PolicyIntro>
        These Terms of Service (the &quot;Terms&quot;) govern your access to and use of the {businessName} website at{' '}
        <a href={websiteUrl}>{websiteUrl}</a>, the {businessName} customer mobile application, the {businessName} restaurant
        partner mobile application, the {businessName} delivery partner mobile application, administrative tools, APIs, and
        related online and offline services (collectively, the &quot;Platform&quot;). By creating an account, placing an order,
        onboarding as a partner, or otherwise using the Platform, you agree to these Terms and the policies linked herein.
      </PolicyIntro>

      <LegalEntityBlock />
      <ContactBlock />

      <PolicyH2>I. Acceptance of terms</PolicyH2>
      <p>
        Thank you for using {businessName}. These Terms are intended to make you aware of your legal rights and responsibilities
        with respect to your access to and use of the {businessName} website, mobile applications, partner tools, delivery tools,
        admin interfaces, and any related pages, features, or services that link to these Terms (collectively, the
        &quot;Services&quot;).
      </p>
      <p>
        These Terms are effective for all existing and future users of {businessName}, including customers who place food orders,
        restaurant partners and local vendors who list menus and accept orders, delivery partners who fulfil delivery assignments,
        and authorized personnel who access administrative tools.
      </p>
      <p>
        Please read these Terms carefully. By accessing or using the Platform, you are agreeing to these Terms and concluding a
        legally binding contract with {legalEntityName} (&quot;{businessName}&quot;, &quot;we&quot;, &quot;us&quot;, or
        &quot;our&quot;). You may not use the Services if you do not accept the Terms or are unable to be bound by the Terms.
        Your use of the Platform is at your own risk, including the risk that you might be exposed to content that is
        objectionable or otherwise inappropriate.
      </p>
      <p>In order to use the Services, you must first agree to the Terms. You can accept the Terms by:</p>
      <ul>
        <li>
          Clicking to accept or agree to the Terms, where it is made available to you by {businessName} in the user interface
          for any particular Service; or
        </li>
        <li>
          Actually using the Services. In this case, you understand and agree that {businessName} will treat your use of the
          Services as acceptance of the Terms from that point onwards.
        </li>
      </ul>
      <p>
        Your use of the Platform is also subject to our <Link to="/privacy">Privacy Policy</Link>,{' '}
        <Link to="/acceptable-use">Acceptable Use Policy</Link>, <Link to="/community-guidelines">Community and Content Guidelines</Link>,{' '}
        <Link to="/refunds">Cancellation and Refund Policy</Link>, <Link to="/payment-terms">Payment Terms</Link>, and other
        role-specific policies referenced on the Platform or in the policy hub below.
      </p>
      <PolicyHubLinks />

      <PolicyH2>II. Definitions</PolicyH2>

      <PolicyH3>Customer</PolicyH3>
      <p>
        &quot;Customer&quot;, &quot;You&quot;, or &quot;Your&quot; refers to you, as a user of the Services. A Customer is
        someone who accesses or uses the Services for the purpose of browsing restaurants, placing orders, receiving deliveries,
        managing an account, submitting reviews or ratings, communicating with support, or otherwise transacting through the
        Platform.
      </p>

      <PolicyH3>Content</PolicyH3>
      <p>
        &quot;Content&quot; includes, without limitation, reviews, ratings, images, photos, audio, video, menu descriptions,
        prices, addresses, location data, delivery notes, support messages, profile information, business listings, and all other
        forms of information or data made available on or through the Platform.
      </p>
      <p>
        &quot;Your Content&quot; or &quot;Customer Content&quot; means content that you upload, share, or transmit to, through,
        or in connection with the Services, such as ratings, reviews, images, photos, messages, chat communications, profile
        information, delivery instructions, or any other materials that you display publicly or in your account profile.
      </p>
      <p>
        &quot;Third Party Content&quot; means content that comes from parties other than {businessName} or its Customers, such as
        Restaurant Partners, Delivery Partners, payment providers, map providers, or other third parties, and is made available
        on or through the Services.
      </p>

      <PolicyH3>Vyaha Content</PolicyH3>
      <p>
        &quot;{businessName} Content&quot; means content that {businessName} creates and makes available in connection with the
        Services including, but not limited to, visual interfaces, interactive features, graphics, design, compilation, computer
        code, software, product layouts, aggregate ratings, reports, operational data associated with your account, and all other
        elements and components of the Services, excluding Your Content and Third Party Content.
      </p>

      <PolicyH3>Restaurant Partner</PolicyH3>
      <p>
        &quot;Restaurant Partner&quot; or &quot;Restaurant&quot; means a restaurant, eatery, cloud kitchen, shop, vendor, or other
        food business listed on the Platform and onboarded to receive orders from Customers through {businessName}. Restaurant
        Partners are independent businesses and are not employees, agents, or franchisees of {businessName} unless expressly
        stated otherwise in a separate written agreement.
      </p>

      <PolicyH3>Delivery Partner</PolicyH3>
      <p>
        &quot;Delivery Partner&quot; means an independent contractor or third-party delivery personnel onboarded on the Platform
        to pick up and deliver orders placed by Customers, where delivery is facilitated through {businessName}. Delivery
        Partners are not employees, agents, or franchisees of {businessName} unless expressly stated otherwise in a separate written
        agreement.
      </p>

      <PolicyH3>Platform</PolicyH3>
      <p>
        &quot;Platform&quot; means the {businessName} customer application, restaurant partner application, delivery partner
        application, website at {websiteUrl}, administrative panel, APIs, notifications, support channels, and related technology
        systems operated by {legalEntityName} to facilitate hyperlocal food ordering and delivery in {serviceAreasFormatted}.
      </p>

      <PolicyH3>Services</PolicyH3>
      <p>
        &quot;Services&quot; means the technology, listing, ordering, payment facilitation, delivery coordination, partner
        onboarding, verification, customer support, and related platform services made available by {businessName} to connect
        Customers with local Restaurant Partners and Delivery Partners. {businessName} operates as an intermediary technology
        platform and does not itself prepare food, own restaurant inventory, or directly employ Delivery Partners except where
        expressly stated in writing.
      </p>

      <PolicyH2>III. Eligibility to use the services</PolicyH2>
      <p>
        You hereby represent and warrant that you are at least eighteen (18) years of age or above and are fully able and
        competent to understand and agree to the terms, conditions, obligations, affirmations, representations, and warranties
        set forth in these Terms, or that you are using the Platform under appropriate parent or guardian supervision where
        permitted by law.
      </p>
      <p>
        <strong>Compliance with laws.</strong> You are in compliance with all laws and regulations in India and in the state of
        Telangana when you access and use the Services within {serviceAreasFormatted}. You agree to use the Services only in
        compliance with these Terms and applicable law, and in a manner that does not violate our legal rights or those of any
        third party.
      </p>
      <p>
        Restaurant Partners and Delivery Partners must provide truthful registration, verification, tax, payout, licensing, and
        operational details and must not use the Platform if barred from doing so under applicable law.
      </p>

      <PolicyH2>IV. Changes to the terms</PolicyH2>
      <p>
        {businessName} may vary, amend, change, or update these Terms from time to time entirely at its own discretion. You shall
        be responsible for checking these Terms from time to time and ensuring continued compliance with them. Your use of the
        Platform after any amendment or change in the Terms shall be deemed your express acceptance of such amended or changed
        terms, and you also agree to be bound by such changed or amended Terms, unless applicable law requires explicit consent for
        a particular change.
      </p>
      <p>
        Material changes may also be notified through the Platform, by SMS, push notification, or email where appropriate. The
        effective date at the top of this page will be updated when revisions are published.
      </p>

      <PolicyH2>V. Translation of the terms</PolicyH2>
      <p>
        {businessName} may provide a translation of the English version of the Terms into other languages for convenience. You
        understand and agree that any translation of the Terms into other languages is only for your convenience and that the
        English version shall govern the terms of your relationship with {businessName}. Furthermore, if there are any
        inconsistencies between the English version of the Terms and its translated version, the English version of the Terms
        shall prevail.
      </p>

      <PolicyH2>VI. Provision of the services being offered by {businessName}</PolicyH2>
      <p>
        {businessName} is a hyperlocal food ordering and delivery platform currently serving {serviceAreasFormatted}. We connect
        Customers with local Restaurant Partners and vendors at genuine in-restaurant menu prices where possible, with transparent
        delivery and platform charges and a low-commission commercial model for Restaurant Partners agreed at onboarding. The
        exact commission, fee structure, and payout terms applicable to a Restaurant Partner are communicated during onboarding
        or in partner dashboards and may vary by category, location, and operational arrangement.
      </p>
      <p>
        {businessName} is constantly evolving in order to provide the best possible experience and information to its Customers
        and partners. You acknowledge and agree that the form and nature of the Services may change from time to time. Therefore,{' '}
        {businessName} reserves the right to suspend, cancel, or discontinue any or all products or services at any time without
        notice, make modifications and alterations in any or all of its contents, products, and services without prior notice,
        and introduce or withdraw features in any part of the Platform.
      </p>
      <p>
        We, the software, or the software application store that makes the software available for download may include
        functionality to automatically check for updates or upgrades to the software. Unless your device, its settings, or computer
        software does not permit transmission or use of upgrades or updates, you agree that we, or the applicable software or
        software application store, may provide notice to you of the availability of such upgrades or updates and automatically
        push such upgrade or update to your device or computer from time to time. You may be required to install certain upgrades
        or updates to the software in order to continue to access or use the Services, or portions thereof.
      </p>
      <p>
        You acknowledge and agree that if {businessName} disables access to your account, you may be prevented from accessing the
        Services, your account details, or any files or other content contained in your account.
      </p>
      <p>
        You acknowledge and agree that while {businessName} may not currently have set a fixed upper limit on the number of
        transmissions you may send or receive through the Services, {businessName} may set such fixed upper limits at any time,
        at its discretion.
      </p>
      <p>
        In our effort to continuously improve the Platform and Services, we undertake research and conduct experiments from time
        to time on various aspects of the Services and offerings, including our apps, websites, user interface, delivery
        assignment logic, and promotional campaigns. As a result, some users may experience features differently than others at any
        given time. This is intended to make the Platform better, more convenient and easy to use, improve user experience,
        enhance safety and security, and develop new services and features.
      </p>

      <PolicyH3>Intermediary status and disclaimers</PolicyH3>
      <p>By using {businessName}&apos;s Services you agree to the following disclaimers:</p>
      <ul>
        <li>
          The Content on the Platform is for informational purposes only. {businessName} disclaims any liability for any
          information that may have become outdated since the last time the particular piece of information was updated.{' '}
          {businessName} reserves the right to make changes and corrections to any part of the Content on the Platform at any
          time without prior notice. {businessName} does not guarantee the quality of food products, the prices listed in menus,
          the availability of all menu items at any Restaurant Partner, or the outcome of any delivery. Unless stated otherwise,
          pictures and information on the Platform are displayed based on materials provided by Restaurant Partners or created
          for platform use. If you are the copyright owner of any Content on the Platform and believe its use violates your
          rights, please contact <MailLink email={legalContacts.support} /> with the exact URL or screen reference.
        </li>
        <li>
          Any certification, licenses, or permits (&quot;Certification&quot;) or information regarding such Certification that may
          be displayed on a Restaurant Partner&apos;s listing page is for informational purposes only. Such Certification is
          displayed by {businessName} on an &quot;as available&quot; basis as provided by Restaurant Partners. {businessName}{' '}
          does not make any warranties about the validity, authenticity, reliability, or accuracy of such Certification or any
          information displayed in this regard. Any reliance by a Customer upon the Certification or related information shall be
          strictly at such Customer&apos;s own risk.
        </li>
        <li>
          {businessName} operates as an intermediary under the Information Technology Act, 2000 and the Information Technology
          (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, where applicable. Restaurant Partners are
          responsible for food preparation, menu accuracy, packaging, labelling, pricing at the outlet, taxes, allergen
          disclosures where applicable, and compliance with applicable food laws including the Food Safety and Standards Act,
          2006 and rules made thereunder. Delivery Partners are responsible for lawful delivery conduct, road safety, and handling
          of orders assigned to them.
        </li>
      </ul>

      <p>
        {businessName} reserves the right to charge platform fees, delivery facilitation fees, subscription fees, or other
        charges in respect of any product or service on the Platform in the future. Any such charges will be disclosed to you
        before you confirm an order or accept a paid feature, to the extent required by applicable law.
      </p>
      <p>
        {businessName} may from time to time introduce referral and/or incentive based programs for its Customers or partners
        (&quot;Program&quot;). These Programs may be governed by their respective terms and conditions. By participating in a
        Program, users are bound by the Program terms as well as these Terms. {businessName} reserves the right to terminate or
        suspend participation, credits, or benefits if it determines that a user has violated Program rules or engaged in
        fraudulent or unlawful activity.
      </p>
      <p>
        {businessName} may from time to time offer credits, promo codes, vouchers, wallet balances, or other promotional
        benefits at its discretion. {businessName} reserves the right to modify, convert, cancel, and/or discontinue such
        benefits, subject to applicable law.
      </p>

      <PolicyH2>VII. Use of services by you or Customer</PolicyH2>

      <PolicyH3>1. {businessName} Customer and partner accounts</PolicyH3>
      <p>
        a. You must create an account in order to use certain features of the Services, including placing orders, managing
        partner operations, or accepting delivery jobs. Use of personal information you provide during account creation is
        governed by our <Link to="/privacy">Privacy Policy</Link>. {businessName} uses OTP-based authentication and token-based
        sessions for platform access. We do not use traditional password-based login for standard customer, partner, or delivery
        accounts unless expressly introduced for a specific authorized admin or internal workflow. You must keep your phone
        number, device, OTPs, and active sessions confidential. You are solely responsible for maintaining the confidentiality and
        security of your account and for all changes and updates submitted through your account and all activities that occur in
        connection with your account.
      </p>
      <p>
        b. In creating an account or onboarding a business, you represent that all information provided to us is true, accurate,
        and correct, and that you will update your information as necessary to keep it accurate. Restaurant Partners represent
        that they are the owner or authorized agent of the listed business. You may not impersonate someone else, create or use an
        account for anyone other than yourself or your authorized business, provide contact details you do not control, create
        duplicate accounts except as authorized by us, or provide false information to obtain access to any listing, payout, or
        operational feature.
      </p>
      <p>
        c. You are responsible for all activities that occur in your account. You agree to notify us immediately of any
        unauthorized use of your account so that we can take necessary corrective action. You also agree that you will not allow
        any third party to use your {businessName} account for any purpose and that you will be liable for such unauthorized
        access.
      </p>
      <p>
        d. By creating an account, you agree to receive certain communications in connection with the Platform or Services,
        including OTP messages, order updates, delivery alerts, payout notices, security warnings, and support replies. You can
        opt out of or manage non-essential promotional communications through app settings where available or as described in our{' '}
        <Link to="/marketing-consent">Marketing and Communications</Link> page.
      </p>

      <PolicyH3>2. Other terms relating to use</PolicyH3>
      <p>
        a. Support communications, including chat, calls, or messages with {businessName} teams, Restaurant Partners, or
        Delivery Partners relating to an order may be logged or recorded for quality, training, fraud prevention, and dispute
        resolution purposes where permitted by law. If you do not wish certain communications to be recorded where optional, please
        use written support channels and clearly state your preference, subject to legal and operational requirements.
      </p>
      <p>
        b. You agree to use the Services only for purposes that are permitted by (i) the Terms and (ii) any applicable law,
        regulation, or generally accepted practices or guidelines in the relevant jurisdictions.
      </p>
      <p>
        c. You agree to use data made available through the Services only for personal or authorized business use and not for
        unauthorized commercial exploitation, scraping, resale, or competitive misuse unless agreed to by {businessName} in
        writing.
      </p>
      <p>
        d. You agree not to access (or attempt to access) any of the Services by any means other than the interface that is
        provided by {businessName}, unless you have been specifically allowed to do so by way of a separate agreement with{' '}
        {businessName}. You specifically agree not to access (or attempt to access) any of the Services through any automated
        means (including use of scripts or web crawlers) except as expressly authorized, and shall comply with the instructions
        set out in any robots.txt file or similar access controls present on the Platform.
      </p>
      <p>
        e. You agree that you will not engage in any activity that interferes with or disrupts the Services (or the servers and
        networks which are connected to the Services). You shall not delete or revise any material or information posted by any
        other user except where expressly permitted, and shall not engage in spamming, including any form of unsolicited emailing,
        posting, or messaging.
      </p>

      <PolicyH2>VIII. Content</PolicyH2>

      <PolicyH3>1. Ownership of {businessName} Content and proprietary rights</PolicyH3>
      <p>
        a. We are the sole and exclusive copyright owners of the Services and our {businessName} Content, except for Third Party
        Content and Your Content. We also own or license the copyrights, trademarks, service marks, logos, trade names, and
        other intellectual and proprietary rights associated with the Services and {businessName} Content, which may be protected
        by copyright, patent, trademark, and other applicable intellectual property laws. You acknowledge that the Services
        contain original works and have been developed, compiled, prepared, revised, selected, and arranged by us and others
        through the application of methods and standards of judgment developed and applied through the expenditure of
        substantial time, effort, and money.
      </p>
      <p>
        b. You agree to protect {businessName}&apos;s proprietary rights and the proprietary rights of all others having rights in
        the Services during and after your use of the Platform and to comply with all reasonable written requests made by us or
        our suppliers and licensors to protect their contractual, statutory, and common law rights in the Services. Unless you
        have agreed otherwise in writing with {businessName}, nothing in the Terms gives you a right to use any of {businessName}
        &apos;s trade names, trademarks, service marks, logos, domain names, or other distinctive brand features.
      </p>
      <p>
        c. You agree not to use any framing techniques to enclose any trademark or logo or other proprietary information of{' '}
        {businessName}; or remove, conceal, or obliterate any copyright or other proprietary notice or source identifier. Any
        infringement may lead to appropriate legal proceedings. You cannot modify, reproduce, publicly display, or exploit in any
        form or manner whatsoever any of the {businessName} Content in whole or in part except as expressly authorized by{' '}
        {businessName}.
      </p>
      <p>
        d. To the fullest extent permitted by applicable law, we neither warrant nor represent that your use of materials
        displayed on the Services will not infringe rights of third parties not owned by or affiliated with us. You agree to
        immediately notify us upon becoming aware of any claim that the Services infringe upon any copyright, trademark, or other
        intellectual property rights by following the process described in Section XVII.
      </p>

      <PolicyH3>2. Your license to {businessName} Content</PolicyH3>
      <p>
        a. We grant you a personal, limited, non-exclusive, and non-transferable license to access and use the Services only as
        expressly permitted in these Terms. You shall not use the Services for any illegal purpose or in any manner inconsistent
        with these Terms. You may use information made available through the Services solely for your personal or authorized
        business use. You agree not to use, copy, display, distribute, modify, broadcast, translate, reproduce, reformat,
        incorporate into advertisements and other works, sell, promote, create derivative works, or in any way exploit or allow
        others to exploit any {businessName} Content in whole or in part except as expressly authorized by us.
      </p>
      <p>
        b. Any violation by you of the license provisions contained in this Section may result in the immediate termination of
        your right to use the Services, as well as potential liability for copyright and other intellectual property infringement
        depending on the circumstances.
      </p>

      <PolicyH3>3. {businessName} license to Your or Customer Content</PolicyH3>
      <p>
        In consideration of availing the Services on the Platform and by submitting Your Content, you hereby grant {businessName}{' '}
        a perpetual, worldwide, non-exclusive, fully paid and royalty-free, assignable, sublicensable, and transferable license
        and right to use Your Content and all intellectual property rights therein for any purpose including platform operations,
        order fulfilment, partner listings, fraud prevention, support, analytics, and promotional display of restaurant listings
        where permitted. By &quot;use&quot; we mean use, copy, display, distribute, modify, translate, reformat, incorporate into
        advertisements and other works, analyze, promote, commercialize, create derivative works, and allow service providers to
        do the same as needed to operate the Platform. You grant us the right to use the name or username that you submit in
        connection with Your Content. You waive, to the extent permitted by law, any claims of moral rights or attribution with
        respect to Your Content brought against {businessName}, its users, or service providers, except where such waiver is not
        permitted by applicable law.
      </p>

      <PolicyH3>4. Representations regarding Your or Customer Content</PolicyH3>
      <p>
        a. You are responsible for Your Content. You represent and warrant that you own or otherwise control all of the rights of
        Your Content or have been granted explicit permission from the rights holder to submit Your Content; Your Content was not
        copied from or based in whole or in part on any other content, work, or website without authorization; Your Content was
        not submitted via the use of any automated process such as a script bot except where authorized; use of Your Content by
        us and other users will not violate or infringe any rights of yours or any third party; Your Content is truthful and
        accurate to the best of your knowledge; and Your Content does not violate our policies or any applicable laws.
      </p>
      <p>
        b. If Your Content is a review, you represent and warrant that you are the sole author of that review; the review reflects
        an actual ordering or dining experience that you had; you were not paid or otherwise remunerated in connection with your
        authoring or posting of the review unless you clearly disclose the commercial relationship as required by law; and you had
        no financial, competitive, or other personal incentive to author or post a review that was not a fair expression of your
        honest opinion.
      </p>
      <p>
        c. You assume all risks associated with Your Content, including anyone&apos;s reliance on its quality, accuracy, or
        reliability, or any disclosure by you of information in Your Content that makes you personally identifiable. While we
        reserve the right to remove Content, we do not control actions or Content posted by our users and do not guarantee the
        accuracy, integrity, or quality of any Content. You acknowledge and agree that Content posted by users and any liability
        arising from such Content is the sole responsibility of the user who posted the content, and not {businessName}, except
        to the extent liability cannot be excluded under applicable law.
      </p>

      <PolicyH3>5. Content removal</PolicyH3>
      <p>
        We reserve the right, at any time and without prior notice, to remove, block, or disable access to any Content that we, for
        any reason or no reason, consider to be objectionable, in violation of the Terms, or otherwise harmful to the Services or
        our users in our sole discretion. Subject to the requirements of applicable law, we are not obligated to return any of Your
        Content to you under any circumstances. Restaurant Partners may request removal of certain images or materials from their
        listing where they own the rights and the material was posted without authorization, subject to verification.
      </p>

      <PolicyH3>6. Third Party Content and links</PolicyH3>
      <p>
        a. Some of the content available through the Services may include or link to materials that belong to third parties, such
        as Restaurant Partners, payment gateways, map providers, app stores, or social media pages. Your use of such third party
        services will be governed by the terms of service and privacy policy applicable to the corresponding third party.
      </p>
      <p>
        b. We have no control over, and make no representation or endorsement regarding the accuracy, relevancy, copyright
        compliance, legality, completeness, timeliness, or quality of any product, services, advertisements, or other content
        appearing in or linked to from the Services.
      </p>
      <p>
        c. We reserve the right, in our sole discretion and without any obligation, to make improvements to, or correct any error
        or omissions in, any portion of the content accessible on the Services. You acknowledge and agree that {businessName} is
        not responsible for the availability of any external sites or resources, and does not endorse any advertising, products,
        or other materials on or available from such websites or resources.
      </p>
      <p>
        d. Third party content, including content posted by our users or Restaurant Partners, does not necessarily reflect our
        views. We assume no responsibility or liability for any of Your Content or any third party content, except to the extent
        liability cannot be excluded under applicable law.
      </p>

      <PolicyH3>7. Customer reviews</PolicyH3>
      <p>
        a. Customer reviews or ratings for Restaurant Partners do not reflect the opinion of {businessName}. {businessName}{' '}
        receives multiple reviews or ratings for Restaurant Partners from Customers, which reflect the opinions of those
        Customers. Each review posted on the Platform is the personal opinion of the reviewer only. {businessName} is a neutral
        platform that provides a means of communication between Customers and businesses.
      </p>
      <p>
        b. We are a neutral platform and we do not arbitrate every dispute. If a Restaurant Partner believes that a review is
        false or violates our policies, it may contact us at <MailLink email={legalContacts.support} /> with supporting details.{' '}
        {businessName} may remove a review in its sole discretion if the review violates the Terms, content guidelines, or is
        otherwise harmful to the Services.
      </p>

      <PolicyH2>IX. Content guidelines and privacy policy</PolicyH2>

      <PolicyH3>1. Content guidelines</PolicyH3>
      <p>
        You represent that you have read, understood, and agreed to our <Link to="/community-guidelines">Community and Content Guidelines</Link>{' '}
        and related policies in the <Link to="/policies">Policy Hub</Link>.
      </p>

      <PolicyH3>2. Privacy policy</PolicyH3>
      <p>
        You represent that you have read, understood, and agreed to our <Link to="/privacy">Privacy Policy</Link>. Please note
        that we may disclose information about you to third parties or government authorities if we believe that such disclosure
        is reasonably necessary to (i) take action regarding suspected illegal activities; (ii) enforce or apply our Terms and
        Privacy Policy; (iii) comply with legal process or other government inquiry; or (iv) protect our rights, reputation, and
        property, or that of our users, affiliates, or the general public.
      </p>

      <PolicyH2>X. Restrictions on use</PolicyH2>
      <p>
        Without limiting the generality of these Terms, in using the Services, you specifically agree not to post or transmit any
        content (including any review) or engage in any activity that, in our sole discretion:
      </p>
      <ol type="a">
        <li>Violates our Guidelines and Policies, including the Acceptable Use Policy and Community and Content Guidelines;</li>
        <li>
          Is harmful, threatening, abusive, harassing, tortious, indecent, defamatory, discriminatory, vulgar, profane, obscene,
          libellous, hateful or otherwise objectionable, invasive of another&apos;s privacy, or relating to or encouraging money
          laundering or gambling;
        </li>
        <li>
          Constitutes an inauthentic or knowingly erroneous review, or does not address the goods and services, delivery
          experience, or other attributes of the business you are reviewing;
        </li>
        <li>Contains material that violates the standards of good taste or the standards of the Services;</li>
        <li>
          Violates any third-party right, including, but not limited to, right of privacy, right of publicity, copyright,
          trademark, patent, trade secret, or any other intellectual property or proprietary rights;
        </li>
        <li>Accuses others of illegal activity, or describes physical confrontations;</li>
        <li>
          Alleges any matter related to health code violations requiring healthcare department reporting without adequate basis;
        </li>
        <li>
          Is illegal, or violates any central, state, or local law or regulation applicable in India or Telangana (for example,
          by disclosing or trading on inside information in violation of securities law);
        </li>
        <li>Attempts to impersonate another person or entity;</li>
        <li>
          Disguises or attempts to disguise the origin of Your Content, including by submitting Your Content under a false name or
          false pretences, or disguising or attempting to disguise the IP address from which Your Content is submitted;
        </li>
        <li>Constitutes a form of deceptive advertisement or causes, or is a result of, a conflict of interest;</li>
        <li>
          Is commercial in nature, including but not limited to spam, surveys, contests, pyramid schemes, postings or reviews
          submitted or removed in exchange for payment, postings or reviews submitted or removed by or at the request of the
          business being reviewed, or other unauthorized advertising materials;
        </li>
        <li>Asserts or implies that Your Content is in any way sponsored or endorsed by us;</li>
        <li>
          Contains material that is not in English or, in the case of products or services provided in other languages, the
          language relevant to such products or services, unless clearly labelled;
        </li>
        <li>Falsely states, misrepresents, or conceals your affiliation with another person or entity;</li>
        <li>Accesses or uses the account of another customer or partner without permission;</li>
        <li>
          Distributes computer viruses or other code, files, or programs that interrupt, destroy, or limit the functionality of
          any computer software or hardware or electronic communications equipment;
        </li>
        <li>
          Interferes with, disrupts, or destroys the functionality or use of any features of the Services or the servers or
          networks connected to the Services;
        </li>
        <li>
          &quot;Hacks&quot; or accesses without permission our proprietary or confidential records, records of another user, or
          those of anyone else;
        </li>
        <li>
          Violates any contract or fiduciary relationship (for example, by disclosing proprietary or confidential information of
          your employer or client in breach of any employment, consulting, or non-disclosure agreement);
        </li>
        <li>Decompiles, reverse engineers, disassembles, or otherwise attempts to derive source code from the Services;</li>
        <li>
          Removes, circumvents, disables, damages, or otherwise interferes with security-related features, or features that
          enforce limitations on use of, the Services;
        </li>
        <li>
          Violates the restrictions in any robot exclusion headers on the Services, if any, or bypasses or circumvents other
          measures employed to prevent or limit access to the Services;
        </li>
        <li>Collects, accesses, or stores personal information about other users of the Services without authorization;</li>
        <li>Is posted by a bot or automated system except as expressly authorized by {businessName};</li>
        <li>Harms minors in any way;</li>
        <li>
          Threatens the unity, integrity, defense, security or sovereignty of India, friendly relations with foreign states, or
          public order or causes incitement to the commission of any cognizable offence or prevents investigation of any offence
          or is insulting to any other nation;
        </li>
        <li>
          Modifies, copies, scrapes or crawls, displays, publishes, licenses, sells, rents, leases, lends, transfers, or otherwise
          commercializes any rights to the Services or {businessName} Content; or
        </li>
        <li>Attempts to do any of the foregoing.</li>
      </ol>
      <p>
        ad. Is patently false and untrue, and is written or published in any form, with the intent to mislead or harass a person,
        entity, or agency for financial gain or to cause any injury to any person.
      </p>
      <p>
        You are strictly prohibited from using our services to create, host, or share any synthetically generated or manipulated
        content that:
      </p>
      <ol type="a">
        <li>Violates applicable laws, including laws relating to fraud, defamation, privacy, and child protection;</li>
        <li>Contains child sexual abuse material, non-consensual intimate imagery, or is obscene, pornographic, or invasive;</li>
        <li>Results in the creation of a false document or electronic record; or</li>
        <li>
          Falsely depicts or portrays a real person or event in a manner likely to deceive others about their identity, actions, or
          statements.
        </li>
      </ol>
      <p>
        You acknowledge that {businessName} has no obligation to monitor your—or anyone else&apos;s—access to or use of the
        Services for violations of the Terms, or to review or edit any content. However, we have the right to do so for the
        purpose of operating and improving the Services (including without limitation for fraud prevention, risk assessment,
        investigation, and customer support purposes), to ensure your compliance with the Terms, and to comply with applicable
        law or the order or requirement of legal process, a court, or other governmental body.
      </p>
      <p>
        You hereby agree and assure {businessName} that the Platform and Services shall be used for lawful purposes only and that
        you will not violate laws, regulations, ordinances, or other requirements of any applicable central, state, or local
        government or international law. You shall not upload, post, email, transmit, or otherwise make available any unsolicited
        or unauthorized advertising, promotional materials, junk mail, spam mail, chain letters, or any other form of solicitation,
        or make any representation or warranty on behalf of {businessName} in any form or manner whatsoever without authorization.
      </p>
      <p>
        You hereby agree and assure that while communicating on the Platform, including giving cooking instructions to Restaurant
        Partners, communicating with support agents, or interacting with Delivery Partners, you shall not use abusive and
        derogatory language and/or post any objectionable information that is unlawful, threatening, defamatory, or obscene. In
        the event you use abusive language and/or post objectionable information, {businessName} reserves the right to suspend
        support services and/or restrict or block your access to the Platform, at any time with or without notice.
      </p>
      <p>
        Any Content uploaded by you shall be subject to relevant laws of India and may be disabled or subject to investigation
        under applicable laws. If you are found to be in non-compliance with laws, these Terms, or the Privacy Policy,{' '}
        {businessName} may block your access, remove non-compliant content, and take appropriate recourse under various statutes.
      </p>

      <PolicyH2>XI. Customer feedback</PolicyH2>
      <p>
        1. If you share or send any ideas, suggestions, changes, or documents regarding {businessName}&apos;s existing business
        (&quot;Feedback&quot;), you agree that (i) your Feedback does not contain the confidential, secretive, or proprietary
        information of third parties, (ii) {businessName} is under no obligation of confidentiality with respect to such
        Feedback and shall be free to use the Feedback on an unrestricted basis, (iii) {businessName} may have already received
        similar Feedback from some other user or may be considering or developing similar ideas, and (iv) by providing the
        Feedback, you grant us a binding, non-exclusive, royalty-free, perpetual, global license to use, modify, develop,
        publish, distribute, and sublicense the Feedback, and you irrevocably waive, to the extent permitted by law, any claims
        against {businessName} with regard to such Feedback.
      </p>
      <p>
        2. Please provide only specific Feedback on {businessName}&apos;s existing products or marketing strategies; do not
        include ideas that our policy will not permit us to accept or consider.
      </p>
      <p>
        3. Notwithstanding the above, {businessName} does not solicit unsolicited ideas for new advertising campaigns, new
        promotions, new or improved products or technologies, product enhancements, processes, materials, marketing plans, or new
        product names (&quot;Submissions&quot;) unless expressly invited through an official program. If, despite our request,
        you still submit them, then regardless of what your communication says, the Feedback and Submission terms above shall
        apply to the extent permitted by law.
      </p>
      <p>
        4. Some of the Services are supported by advertising revenue and may display advertisements and promotions. These
        advertisements may be targeted to the content of information stored on the Services, queries made through the Services,
        or other information. The manner, mode, and extent of advertising by {businessName} on the Services are subject to change
        without specific notice to you. In consideration for {businessName} granting you access to and use of the Services, you
        agree that {businessName} may place such advertising on the Services where permitted by law.
      </p>
      <p>
        5. Part of the Platform may contain advertising information or promotional material submitted by third parties, Restaurant
        Partners, or other users. Responsibility for ensuring that material submitted for inclusion on the Platform complies with
        applicable law is on the party providing the information or material. Your correspondence or business dealings with
        advertisers other than {businessName} found on or through the Platform, including payment and delivery of related goods
        or services, shall be solely between you and such advertiser.
      </p>

      <PolicyH2>
        XIII. Additional Terms and Conditions for Customers using the various services offered by {businessName}
      </PolicyH2>

      <PolicyH3>1. Food ordering and delivery</PolicyH3>
      <p>
        a. {businessName} provides food ordering and delivery services in {serviceAreasFormatted} by entering into contractual or
        commercial arrangements with Restaurant Partners on a principal-to-principal basis for the purpose of listing their menu
        items or products for ordering and delivery by Customers on the Platform.
      </p>
      <p>
        b. Customers can access menu items or products listed on the Platform and place orders with Restaurant Partners through{' '}
        {businessName}.
      </p>
      <p>
        c. Your request to order food, beverages, or products from a Restaurant Partner page on the Platform shall constitute an
        unconditional and irrevocable authorization issued in favour of {businessName} to place orders for food, beverages, or
        products with the relevant Restaurant Partner on your behalf, subject to cancellation rights described in our{' '}
        <Link to="/refunds">Cancellation and Refund Policy</Link>.
      </p>
      <p>
        d. Delivery of an order placed by you through the Platform may be undertaken directly by the Restaurant Partner or
        facilitated by {businessName} through a Delivery Partner available to provide delivery services to you. In both cases,{' '}
        {businessName} is acting as an intermediary between you and the Delivery Partner, or you and the Restaurant Partner, as
        the case may be.
      </p>
      <p>
        e. The acceptance by a Delivery Partner of undertaking delivery of your order shall constitute a contract of service under
        the Consumer Protection Act, 2019 or any successor legislation, between you and the Delivery Partner, to which {businessName}{' '}
        is not a party except to the extent it acts as an intermediary platform. It is clarified that {businessName} does not
        itself provide physical delivery or logistics services as a principal and enables delivery of food, beverages, or products
        ordered by Customers through the Platform by connecting Customers with Delivery Partners or Restaurant Partners, as the
        case may be. {businessName} shall not be liable for any acts or omissions on the part of the Delivery Partner including
        deficiency in service, wrong delivery of order, time taken to deliver the order, order package tampering, or road safety
        incidents, except to the extent liability cannot be excluded under applicable law.
      </p>
      <p>
        f. Where {businessName} is facilitating delivery of an order placed by you on the Platform, your order may be grouped or
        batched with another order where operationally efficient and permitted by platform rules.
      </p>
      <p>
        g. You may be charged a delivery fee (plus applicable taxes) for delivery of your order by the Delivery Partner or the
        Restaurant Partner, as determined by platform rules and partner arrangements (&quot;Delivery Charges&quot;). You agree that{' '}
        {businessName} is authorized to collect, on behalf of the Restaurant Partner or the Delivery Partner, the Delivery
        Charges for the delivery service provided by the Restaurant Partner or the Delivery Partner, as the case may be. Delivery
        Charges may vary from order to order based on factors including Restaurant Partner, order value, distance, time of day,
        and demand. {businessName} will inform you of the Delivery Charges that apply before order confirmation, provided you
        will be responsible for Delivery Charges incurred for your order regardless of your awareness of such Delivery Charges.
      </p>
      <p>
        h. In addition to Delivery Charges, you may also be charged an amount towards delivery surge (plus applicable taxes) for
        delivery facilitated during peak demand, longer distance, adverse weather, or other operational conditions
        (&quot;Delivery Surge&quot;), where applicable. You agree that {businessName} is authorized to collect Delivery Surge on
        behalf of the relevant party providing delivery service. {businessName} will use reasonable efforts to inform you of
        applicable Delivery Surge before confirmation.
      </p>
      <p>
        i. In respect of orders placed by you, {businessName} may issue or facilitate documents like order summaries, tax
        invoices, or receipts as per applicable legal regulations and common business practices. Primary tax and invoice
        responsibility for the underlying food sale remains with the Restaurant Partner unless otherwise required by law or an
        express written arrangement.
      </p>
      <p>
        j. You are expected to respect the dignity and diversity of Delivery Partners and Restaurant staff. You agree not to
        discriminate against any Delivery Partner on the basis of race, community, religion, disability, gender, sexual
        orientation, gender identity, age (insofar as permitted by applicable laws), or any other legally protected status. You
        are also expected to enable a secure and respectful work environment and not harass Delivery Partners or restaurant
        personnel.
      </p>

      <PolicyH4>A. Food ordering and delivery with Restaurant Partners</PolicyH4>
      <p>
        a. All prices listed on the Platform are provided by the Restaurant Partner, including packaging or handling charges, if
        any, at the time of publication on the Platform and are displayed by {businessName} as received from the Restaurant
        Partner. {businessName}&apos;s commercial model is designed to list genuine in-restaurant menu prices where possible and
        to apply low platform commission to Restaurant Partners as agreed at onboarding. While we take care to keep listings
        updated, the final price charged to you by the Restaurant Partner, including packaging and handling charges, may change
        at the time of acceptance or fulfilment if the Restaurant Partner updates pricing or availability. In the event of a
        conflict between the price on the Platform and the price charged by the Restaurant Partner at fulfilment, the Restaurant
        Partner&apos;s confirmed order price shall generally prevail except for separately disclosed Delivery Charges and platform
        fees shown at checkout.
      </p>
      <p>
        b. Delivery time estimates shown on the Platform are approximate only and may vary based on restaurant preparation load,
        distance, weather, traffic, Delivery Partner availability, address accuracy, and operational constraints in{' '}
        {serviceAreasFormatted}.
      </p>

      <PolicyH4>B. General terms and conditions for food ordering</PolicyH4>
      <p>
        a. {businessName} is not a manufacturer, seller, or distributor of food and beverages or products and places an order with
        Restaurant Partners on behalf of Customers pursuant to the authorization granted by Customers, facilitating the sale and
        purchase of food, beverages, or products between Customers and Restaurant Partners.
      </p>
      <p>
        b. {businessName} shall not be liable for any acts or omissions on the part of the Restaurant Partner including deficiency
        in service, wrong delivery of order or order mismatch, quality, incorrect pricing, deficient quantity, time taken to
        prepare or deliver the order, or food safety issues, except to the extent liability cannot be excluded under applicable
        law.
      </p>
      <p>
        c. Restaurant Partners shall be solely responsible for any warranty or guarantee of the food and beverages or products sold
        to the Customer and, in no event, shall such responsibility be that of {businessName} as a platform intermediary.
      </p>
      <p>
        d. For Customers in India, the liability of any violation of applicable rules and regulations relating to food products
        shall solely rest with the sellers, brand owners, vendors, Restaurant Partners, importers, or manufacturers of the food
        products accordingly.
      </p>
      <p>
        e. Some food and beverage items may be suitable for certain ages or dietary needs only. You should check the item you are
        ordering and read its description, if provided, prior to placing your order. Customers with allergies or dietary
        restrictions must review menu details carefully and contact support where needed. {businessName} does not guarantee
        allergen-free preparation unless expressly stated by the Restaurant Partner.
      </p>
      <p>
        f. While placing an order you shall be required to provide certain details, including without limitation, contact number
        and delivery address within {serviceAreasFormatted}. You agree to take particular care when providing these details and
        warrant that these details are accurate and complete at the time of placing an order. Orders outside the active service
        area may be declined.
      </p>
      <p>
        g. You or any person instructed by you shall not resell food and beverages or products purchased via the Platform except
        where lawful and expressly permitted.
      </p>
      <p>
        h. The total price for food ordered, including item prices, taxes, Delivery Charges, platform fees, packing fees, and
        other applicable charges, will be displayed on the Platform when you place your order. Customers shall make full payment
        towards such food or products ordered via the Platform using supported methods such as cash on delivery, UPI, cards, net
        banking, or other methods shown at checkout.
      </p>
      <p>
        i. Any amount charged by {businessName} over and above the item value shall be subject to applicable taxes and disclosed
        at checkout where required.
      </p>
      <p>
        j. Delivery periods quoted at the time of ordering are approximate only and may vary.
      </p>
      <p>
        k. Promo codes and promotional benefits can only be used by you subject to terms set forth by {businessName} from time to
        time and may not be combined unlawfully or misused.
      </p>
      <p>
        l. Cancellation and refund policy:
      </p>
      <ul>
        <li>
          Cancellations and refunds are governed by our <Link to="/refunds">Cancellation and Refund Policy</Link>. No replacement,
          refund, or other resolution may be provided without review of order status, restaurant preparation stage, delivery
          assignment, and available evidence.
        </li>
        <li>
          Any complaint with respect to the order, including food spillage, foreign objects in food, delivery of the wrong order
          or items, poor quality, missing items, or significant delay, may require you to share proof before resolution is
          provided.
        </li>
        <li>
          You shall not be entitled to a refund in case instructions placed along with the order are not followed in the form and
          manner you intended, where instructions are followed by the Restaurant Partner on a best-efforts basis.
        </li>
        <li>
          All refunds shall be processed in the same manner as they are received, unless refunds have been provided to you in the
          form of credits or another method permitted by {businessName} and applicable law.
        </li>
      </ul>
      <p>
        m. Liquidated damages and customer responsibility:
      </p>
      <p>
        You acknowledge that (1) your cancellation, or attempted or purported cancellation of an order, or (2) cancellation due to
        reasons not attributable to {businessName}, including where you provide incorrect particulars, contact number, delivery
        address, or are unresponsive, not reachable, or unavailable for fulfilment of the services offered to you, may amount to a
        breach of your unconditional and irrevocable authorization in favour of {businessName} to place that order with Restaurant
        Partners on your behalf (&quot;Authorization Breach&quot;). In the event you commit an Authorization Breach, you may be
        liable for losses attributable to the Restaurant Partner, Delivery Partner, and other concerned parties on account of
        cancellation of the order, subject to applicable law and our refund policy. You authorize {businessName} to recover
        reasonable amounts payable through means permitted by law and platform rules, including adjustment against future orders or
        promotional balances where allowed.
      </p>
      <p>
        There may be cases where {businessName} is unable to accept your order or cancels the order due to reasons including
        technical errors, unavailability of item(s), service area limits, payment failure, fraud review, or inability to complete
        delivery safely. In such cases, {businessName} shall not charge improper cancellation penalties. If the order is cancelled
        after payment has been charged and you are eligible for a refund of the order value or any part thereof, the said amount
        will be reversed to you in accordance with our refund policy and payment provider timelines.
      </p>

      <PolicyH2>XIV. Disclaimer of warranties, limitation of liability, and indemnification</PolicyH2>

      <PolicyH3>1. Disclaimer of warranties</PolicyH3>
      <p>
        YOU ACKNOWLEDGE AND AGREE THAT THE SERVICES ARE PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; AND THAT YOUR USE
        OF THE SERVICES SHALL BE AT YOUR SOLE RISK. TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, {legalEntityName.toUpperCase()},
        ITS AFFILIATES, AND THEIR RESPECTIVE OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, AND LICENSORS (&quot;{businessName.toUpperCase()}{' '}
        PARTIES&quot;) DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, IN CONNECTION WITH THE SERVICES AND YOUR USE OF THEM. TO THE
        FULLEST EXTENT PERMITTED BY APPLICABLE LAW, THE {businessName.toUpperCase()} PARTIES MAKE NO WARRANTIES OR REPRESENTATIONS
        THAT THE SERVICES HAVE BEEN OR WILL BE PROVIDED WITH DUE SKILL, CARE, AND DILIGENCE OR ABOUT THE ACCURACY OR COMPLETENESS
        OF THE SERVICES&apos; CONTENT AND ASSUME NO RESPONSIBILITY FOR ANY (I) ERRORS, MISTAKES, OR INACCURACIES OF CONTENT, (II)
        PERSONAL INJURY OR PROPERTY DAMAGE OF ANY NATURE WHATSOEVER RESULTING FROM YOUR ACCESS TO AND USE OF THE SERVICES, (III)
        ANY UNAUTHORIZED ACCESS TO OR USE OF OUR SERVERS AND/OR ANY AND ALL PERSONAL INFORMATION STORED THEREIN, (IV) ANY
        INTERRUPTION OR CESSATION OF TRANSMISSION TO OR FROM THE SERVICES, (V) ANY BUGS, VIRUSES, TROJAN HORSES, OR THE LIKE WHICH
        MAY BE TRANSMITTED TO OR THROUGH THE SERVICES THROUGH THE ACTIONS OF ANY THIRD PARTY, (VI) ANY LOSS OF YOUR DATA OR
        CONTENT FROM THE SERVICES, OR (VII) ANY ERRORS OR OMISSIONS IN ANY CONTENT OR FOR ANY LOSS OR DAMAGE OF ANY KIND INCURRED
        AS A RESULT OF THE USE OF ANY CONTENT POSTED, EMAILED, TRANSMITTED, OR OTHERWISE MADE AVAILABLE VIA THE SERVICES.
      </p>
      <p>
        NO ADVICE OR INFORMATION, WHETHER ORAL OR WRITTEN, OBTAINED BY YOU FROM {businessName.toUpperCase()} OR THROUGH OR FROM
        THE SERVICES SHALL CREATE ANY WARRANTY NOT EXPRESSLY STATED IN THE TERMS. NOTHING IN THIS SECTION LIMITS WARRANTIES OR
        RIGHTS THAT CANNOT BE LIMITED UNDER THE CONSUMER PROTECTION ACT, 2019 OR OTHER MANDATORY APPLICABLE LAW.
      </p>

      <PolicyH3>2. Limitation of liability</PolicyH3>
      <p>
        TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL THE {businessName.toUpperCase()} PARTIES BE LIABLE TO
        YOU FOR ANY INDIRECT, INCIDENTAL, SPECIAL, PUNITIVE, EXEMPLARY, OR CONSEQUENTIAL DAMAGES WHATSOEVER, HOWEVER CAUSED AND
        UNDER ANY THEORY OF LIABILITY, INCLUDING BUT NOT LIMITED TO ANY LOSS OF PROFIT, ANY LOSS OF GOODWILL OR BUSINESS
        REPUTATION, ANY LOSS OF DATA SUFFERED, OR OTHER INTANGIBLE LOSS.
      </p>
      <p>
        TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL THE {businessName.toUpperCase()} PARTIES BE LIABLE TO
        YOU FOR ANY DAMAGES RESULTING FROM (I) ERRORS, MISTAKES, OR INACCURACIES OF CONTENT, (II) PERSONAL INJURY OR PROPERTY
        DAMAGE RESULTING FROM YOUR ACCESS TO AND USE OF THE SERVICES, (III) UNAUTHORIZED ACCESS TO OR USE OF OUR SERVERS OR
        STORED INFORMATION, (IV) INTERRUPTION OR CESSATION OF TRANSMISSION TO OR FROM THE SERVICES, (V) BUGS, VIRUSES, OR
        MALICIOUS CODE TRANSMITTED THROUGH THE SERVICES BY THIRD PARTIES, (VI) LOSS OF YOUR DATA OR CONTENT, (VII) ERRORS OR
        OMISSIONS IN ANY CONTENT, (VIII) DISCLOSURE OF INFORMATION PURSUANT TO THESE TERMS OR OUR PRIVACY POLICY, (IX) YOUR
        FAILURE TO KEEP YOUR OTP, DEVICE, OR ACCOUNT DETAILS SECURE AND CONFIDENTIAL, OR (X) DELAY OR FAILURE IN PERFORMANCE
        RESULTING FROM CAUSES BEYOND {businessName.toUpperCase()}&apos;S REASONABLE CONTROL.
      </p>
      <p>
        NOTHING IN THESE TERMS LIMITS LIABILITY THAT CANNOT BE LIMITED UNDER APPLICABLE LAW, INCLUDING RIGHTS AVAILABLE TO
        CONSUMERS UNDER THE CONSUMER PROTECTION ACT, 2019 AND RULES MADE THEREUNDER.
      </p>

      <PolicyH4>Indemnification</PolicyH4>
      <p>
        You agree to indemnify, defend, and hold harmless the {businessName} Parties from and against any third party claims,
        damages, actions, proceedings, demands, losses, liabilities, costs, and expenses (including reasonable legal fees)
        suffered or reasonably incurred by us arising as a result of, or in connection with: (i) Your Content; (ii) your
        unauthorized use of the Services or products or services included or advertised in the Services; (iii) your access to and
        use of the Services; (iv) your violation of any rights of another party; or (v) your breach of these Terms, including
        any infringement by you of the copyright or intellectual property rights of any third party. We retain the exclusive right
        to settle, compromise, and pay, without your prior consent, any and all claims or causes of action brought against us. We
        reserve the right, at your expense, to assume the exclusive defense and control of any matter for which you are required to
        indemnify us and you agree to cooperate with our defense of these claims.
      </p>

      <PolicyH2>XV. Termination of your access to the services</PolicyH2>
      <p>
        You can request deletion of your account at any time by following our <Link to="/delete-account">Account Deletion</Link>{' '}
        process or by contacting <MailLink email={legalContacts.support} />.
      </p>
      <p>
        We may terminate your use of the Services and deny you access to the Services in our sole discretion for any reason or no
        reason, including your (i) violation of these Terms; or (ii) lack of use of the Services; or (iii) fraud, abuse, safety
        risk, or legal concern. You agree that any termination of your access to the Services may be effected without prior notice,
        and acknowledge and agree that we may immediately deactivate or delete your account and all related information and/or bar
        any further access to your account or the Services. If you use the Services in violation of these Terms, we may, in our
        sole discretion, retain data collected from your use of the Services as permitted by law. Further, you agree that we shall
        not be liable to you or any third party for the discontinuation or termination of your access to the Services, except to
        the extent required by applicable law.
      </p>

      <PolicyH2>XVI. General terms</PolicyH2>
      <p>
        <strong>Interpretation:</strong> The section and subject headings in these Terms are included for reference only and shall
        not be used to interpret any provisions of these Terms.
      </p>
      <p>
        <strong>Entire agreement and waiver:</strong> The Terms, together with the Privacy Policy and policies linked on the
        Platform, shall constitute the entire agreement between you and us concerning the Services. No failure or delay by us in
        exercising any right, power, or privilege under the Terms shall operate as a waiver of such right or acceptance of any
        variation of the Terms.
      </p>
      <p>
        <strong>Severability:</strong> If any provision of these Terms is deemed unlawful, invalid, or unenforceable by a judicial
        court for any reason, then that provision shall be deemed severed from these Terms, and the remainder of the Terms shall
        continue in full force and effect.
      </p>
      <p>
        <strong>Partnership or agency:</strong> None of the provisions of these Terms shall be deemed to constitute a partnership
        or agency between you and {businessName}, and you shall have no authority to bind {businessName} in any manner whatsoever.
        Restaurant Partners and Delivery Partners are independent businesses or contractors and are not employees of {businessName}{' '}
        unless expressly agreed in writing.
      </p>
      <p>
        <strong>Governing law and jurisdiction:</strong> These Terms shall be governed by the {governingLaw}. Subject to
        mandatory consumer protection rights, courts at {registeredOffice.city}, {registeredOffice.state} shall have jurisdiction
        over disputes arising under these Terms. Nothing in these Terms prevents you from approaching the appropriate consumer
        dispute redressal commission or forum under the Consumer Protection Act, 2019 where you qualify as a consumer under
        applicable law.
      </p>
      <p>
        Before filing a claim, users are encouraged to contact <MailLink email={legalContacts.support} /> so we can attempt
        good-faith resolution within a reasonable period.
      </p>
      <p>
        <strong>Force majeure:</strong> {businessName} is not responsible for delays or failures caused by events outside
        reasonable control, including natural disasters, strikes, network outages, payment gateway failures, government actions, or
        severe weather affecting restaurants or delivery operations in {serviceAreasFormatted}.
      </p>
      <p>
        <strong>Assignment:</strong> {businessName} may assign or transfer its rights and obligations under these Terms as part
        of a merger, acquisition, restructuring, or asset sale, subject to applicable law. You may not assign your rights without{' '}
        {businessName}&apos;s prior written consent.
      </p>
      <p>
        <strong>Carrier rates may apply:</strong> By accessing the Services through a mobile or other device, you may be subject to
        charges by your internet or mobile service provider. Check with your provider if you are not sure, as you will be solely
        responsible for any such costs incurred.
      </p>
      <p>
        <strong>Linking and framing:</strong> You may not frame the Services. You may link to the Services, provided that you
        acknowledge and agree that you will not link the Services to any website containing inappropriate, profane, defamatory,
        infringing, obscene, indecent, or unlawful material or information or that violates any intellectual property, privacy,
        or publicity rights. Any violation of this provision may result in termination of your use of and access to the Services.
      </p>

      <PolicyH2>XVII. Notice of copyright infringement</PolicyH2>
      <p>
        {businessName} respects the intellectual property rights of others and requires those that use the Services to do the same.
        We may, in appropriate circumstances and at our discretion, remove or disable access to material on the Services that
        infringes upon the copyright rights of others. If you believe that your copyright has been or is being infringed upon by
        material found in the Services, you are required to follow the procedure below to file a notification:
      </p>
      <ol type="i">
        <li>Identify in writing the copyrighted material that you claim has been infringed upon;</li>
        <li>
          Identify in writing the material on the Services that you allege is infringing upon copyrighted material, and provide
          sufficient information that reasonably identifies the location of the alleged infringing material;
        </li>
        <li>
          Include the following statement: &quot;I have a good faith belief that the use of the content on the Services as described
          above is not authorized by the copyright owner, its agent, or law&quot;;
        </li>
        <li>
          Include the following statement: &quot;I swear that the information in my notice is accurate and I am the copyright owner
          or I am authorized to act on the copyright owner&apos;s behalf&quot;;
        </li>
        <li>Provide your contact information including your address, telephone number, and email address;</li>
        <li>Provide your physical or electronic signature; and</li>
        <li>
          Send us a written communication to <MailLink email={legalContacts.support} /> with the subject line Copyright Notice.
        </li>
      </ol>
      <p>You may be subject to liability if you knowingly make any misrepresentations on a takedown notice.</p>

      <PolicyH2>XVIII. Contact us</PolicyH2>

      <PolicyH3>1. Details of the company</PolicyH3>
      <PolicyNote>
        <strong>Legal entity name:</strong> {legalEntityName}
        <br />
        <strong>Brand:</strong> {businessName}
        <br />
        <strong>Registered office:</strong> {registeredOffice.line1}, {registeredOffice.line2}, {registeredOffice.city},{' '}
        {registeredOffice.state} {registeredOffice.pincode}, {registeredOffice.country}
        <br />
        <strong>GSTIN:</strong> {gstin}
        <br />
        <strong>Website:</strong> <a href={websiteUrl}>{websiteUrl}</a>
        <br />
        <strong>Service area:</strong> {serviceAreasFormatted}
        <br />
        <strong>Platform:</strong> {businessName} customer app, restaurant partner app, delivery partner app, website, and admin
        tools
        <br />
        <strong>General contact:</strong> <MailLink email={legalContacts.support} />
      </PolicyNote>

      <PolicyH3>2. Grievance redressal mechanism</PolicyH3>
      <p>
        i. <strong>Customer care channels</strong>
      </p>
      <ul>
        <li>
          For order-related issues, you may contact us at <MailLink email={legalContacts.support} /> with your order ID and
          registered phone number.
        </li>
        <li>
          For grievances under applicable Indian law, including the Information Technology Act, 2000 and the Consumer Protection
          Act, 2019, you may write to <MailLink email={legalContacts.grievance} />.
        </li>
        <li>
          We aim to acknowledge grievances within {grievanceOfficer.acknowledgementWindow} and respond within{' '}
          {grievanceOfficer.responseWindow}, subject to complexity and legal requirements.
        </li>
      </ul>
      <p>ii. <strong>Details of the grievance officer</strong></p>
      <GrievanceOfficerBlock />
      <p>
        For users in India, please note that in compliance with the Information Technology Act, 2000 and the rules made thereunder,
        as well as the Consumer Protection Act, 2019 and the rules made thereunder, the grievance redressal mechanism, including
        the contact details of the grievance officer, are provided above. Nothing in these Terms limits your right to approach the
        appropriate consumer forum where applicable.
      </p>
      <PolicyNote>
        <strong>Security reminder:</strong> {businessName} does not solicit confidential information such as OTP, CVV, PIN, card
        number, or UPI PIN through unsolicited calls or messages. Please do not reveal these details to fraudsters claiming to
        represent {businessName}. Report suspicious activity to <MailLink email={legalContacts.fraud} /> or{' '}
        <MailLink email={legalContacts.support} />.
      </PolicyNote>
    </>
  );
}
