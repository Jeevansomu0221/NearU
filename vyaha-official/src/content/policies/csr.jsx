import { effectiveDate, businessName, legalEntityName, websiteUrl, legalContacts } from '../legalConfig';
import {
  ContactBlock,
  LegalEntityBlock,
  MailLink,
  PolicyIntro,
  PolicyNote,
} from '../policyComponents';
import { PolicyH2, PolicyH3 } from './policyPrimitives';

export function CsrContent() {
  return (
    <>
      <p><strong>Effective date:</strong> {effectiveDate}</p>
      <PolicyIntro>
        This Corporate Social Responsibility (CSR) Policy is adopted by {legalEntityName} in accordance with Section 135 and related provisions of the Companies Act, 2013, and the Companies (Corporate Social Responsibility Policy) Rules, 2014, where applicable.
      </PolicyIntro>
      <LegalEntityBlock />
      <ContactBlock />

      <PolicyH2>I. Philosophy</PolicyH2>
      <p>
        {businessName} is built around a local-vendor-first mission: affordable food access for customers, fair economics for neighborhood restaurants, and practical earning opportunities for delivery partners in Hyderabad. Our CSR philosophy extends that mission into community impact by supporting local businesses, reducing barriers to everyday food access, and contributing to social and environmental well-being in the communities we serve.
      </p>
      <ul>
        <li>Strengthen local food vendors and small businesses in Hyderabad.</li>
        <li>Support initiatives that improve access to affordable, hygienic food for underserved communities.</li>
        <li>Encourage responsible delivery operations and waste reduction where feasible.</li>
        <li>Promote digital literacy and practical skills for local entrepreneurs and delivery partners.</li>
      </ul>

      <PolicyH2>II. Objectives and Scope</PolicyH2>
      <PolicyH3>Objectives</PolicyH3>
      <ul>
        <li><strong>Hunger and nutrition:</strong> Support food distribution, community meals, or nutrition awareness programs in Hyderabad where aligned with local needs.</li>
        <li><strong>Education and skills:</strong> Support education, vocational training, or digital literacy programs for youth, women entrepreneurs, and delivery partners.</li>
        <li><strong>Local business support:</strong> Enable micro-grants, training, or tooling support for small restaurants and neighborhood vendors.</li>
        <li><strong>Environmental responsibility:</strong> Encourage packaging reduction, responsible waste handling, and awareness campaigns related to sustainable local commerce.</li>
      </ul>
      <PolicyH3>Scope</PolicyH3>
      <p>
        CSR activities will primarily focus on communities within Hyderabad and Telangana, particularly neighborhoods where {businessName} operates or where local vendors and delivery partners are active. Activities may be undertaken directly by {legalEntityName} or through registered trusts, societies, or section 8 companies with established track records, as permitted by law.
      </p>

      <PolicyH2>III. Implementation</PolicyH2>
      <p>
        When CSR expenditure becomes legally applicable under the Companies Act, 2013, {legalEntityName} will constitute a CSR Committee as required by law. The committee will recommend and monitor CSR programs, approve annual plans, review impact, and ensure compliance with statutory reporting requirements.
      </p>
      <PolicyNote>
        Until CSR obligations are legally triggered, {legalEntityName} may undertake voluntary community initiatives aligned with this policy without constituting a formal CSR Committee. A formal committee framework will be established when legally required.
      </PolicyNote>
      <PolicyH3>Implementation Principles</PolicyH3>
      <ul>
        <li>Projects should be need-based, measurable where practicable, and aligned with Schedule VII activities under the Companies Act, 2013.</li>
        <li>Preference will be given to programs benefiting local vendors, food access, education, and environmental sustainability in Hyderabad.</li>
        <li>CSR funds will not be used for normal business marketing, political contributions, or activities benefiting only {legalEntityName} employees unless permitted by law.</li>
      </ul>

      <PolicyH2>IV. Expenditure</PolicyH2>
      <p>
        When applicable under the Companies Act, 2013, {legalEntityName} will spend at least <strong>2%</strong> of the average net profits of the immediately preceding three financial years on CSR activities in accordance with statutory requirements. Surplus arising from CSR projects will be handled as required by applicable rules and will not form part of business profits.
      </p>
      <p>
        Administrative overheads related to CSR, if any, will be kept reasonable and within limits permitted by law.
      </p>

      <PolicyH2>V. Publication</PolicyH2>
      <p>
        This CSR Policy will be published on <a href={websiteUrl}>{websiteUrl}</a> and updated when programs, legal requirements, or governance structures change. Annual CSR reports or disclosures will be included in statutory filings when legally required.
      </p>

      <PolicyH2>VI. Revision History</PolicyH2>
      <table className="policy-table">
        <thead>
          <tr>
            <th>Version</th>
            <th>Date</th>
            <th>Summary of Changes</th>
            <th>Approved By</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1.0</td>
            <td>{effectiveDate}</td>
            <td>Initial adoption of CSR Policy for {legalEntityName}.</td>
            <td>Board of Directors (when constituted) / Authorized Signatory</td>
          </tr>
        </tbody>
      </table>

      <PolicyH2>Contact</PolicyH2>
      <p>
        CSR-related inquiries: <MailLink email={legalContacts.support} />.
      </p>
    </>
  );
}
