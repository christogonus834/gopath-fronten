// Describes everything that can be edited without touching code.
// SETTINGS_SCHEMA: page text and images (default shown until the admin changes it)
// SECTIONS: repeatable blocks stored in the content_items table
const U = (id, w = 1200) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&crop=faces,edges&w=${w}&q=70`;
const IMG_HERO = U('1504150558240-0b4fd8946624', 1600), IMG_ABOUT = U('1531482615713-2afd69097998', 1100),
  IMG_TEAM = U('1522071820081-009f0129c71c', 1400), IMG_DEST1 = U('1534964542054-81ea785bde49'), IMG_CANADA = U('1671752862966-3e28f22453cd');

// [key, label, default, type] type: t = text (default), a = long text, i = image
const grp = (g, rows) => rows.map(r => ({ k: r[0], l: r[1], g, d: r[2], t: r[3] || 't' }));
const SETTINGS_SCHEMA = [
  ...grp('Brand and contact', [
    ['img_logo_dark', 'Logo (shown on white backgrounds)', 'img/logo-dark.png', 'i'], ['img_logo_light', 'Logo (shown on dark backgrounds)', 'img/logo-light.png', 'i'],
    ['brand_a', 'Brand name, first part (emails and image text)', 'GoPath'], ['brand_b', 'Brand name, second part', 'Legal'],
    ['office_address', 'Office address', '[OFFICE ADDRESS]'], ['phone', 'Phone', '[PHONE]'],
    ['email', 'Public email', 'hello@[YOURDOMAIN]'], ['hours', 'Opening hours', 'Mon–Sat 9:00–17:00'],
    ['topbar_cta', 'Top bar link', 'Book a free consultation →']]),
  ...grp('Home: hero', [
    ['hero_chip', 'Small label', 'United States · Australia · Canada'], ['hero_title', 'Heading', 'Work abroad.'],
    ['hero_accent', 'Heading (blue part)', 'We handle the paperwork.'],
    ['hero_lead', 'Intro text', 'Verified jobs overseas, then step-by-step help with your visa and every government form until you land.', 'a'],
    ['hero_btn1', 'Button 1', 'Find jobs'], ['hero_btn2', 'Button 2', 'Visa services'], ['img_hero', 'Hero photo', IMG_HERO, 'i'],
    ['apply_chip', 'Apply card label', 'Apply now'], ['apply_title', 'Apply card heading', 'Apply for a job']]),
  ...grp('Home: sections', [
    ['about_chip', 'About: label', 'About us'], ['about_title', 'About: heading', 'Who we are,'], ['about_em', 'About: heading (blue)', 'and how we help'],
    ['about_lead', 'About: intro', 'One team for the whole journey, from your first job search to your first week abroad.', 'a'],
    ['about_btn', 'About: button', 'Know more about us'], ['img_about', 'About photo', IMG_ABOUT, 'i'],
    ['jobs_chip', 'Jobs: label', 'Job board'], ['jobs_title', 'Jobs: heading', 'Available'], ['jobs_em', 'Jobs: heading (blue)', 'jobs'], ['jobs_btn', 'Jobs: button', 'See all jobs'],
    ['svc_chip', 'Services: label', 'Services'], ['svc_title', 'Services: heading', 'Our visa and'], ['svc_em', 'Services: heading (blue)', 'paperwork services'],
    ['dest_chip', 'Destinations: label', 'Destinations'], ['dest_title', 'Destinations: heading', 'Where we'], ['dest_em', 'Destinations: heading (blue)', 'place you'],
    ['cta_chip', 'Call to action: label', 'Job for you'], ['cta_title', 'Call to action: heading', 'Are you ready to work abroad?'],
    ['cta_text', 'Call to action: text', 'Start with a free eligibility check. No payment until you hold a verified offer.', 'a'],
    ['cta_btn', 'Call to action: button', 'Apply now'], ['img_cta', 'Call to action photo', IMG_CANADA, 'i'],
    ['how_chip', 'How it works: label', 'How it works'], ['how_title', 'How it works: heading', 'Six steps from'], ['how_em', 'How it works: heading (blue)', 'search to arrival'],
    ['placed_chip', 'Placed: label', 'Placed'], ['placed_title', 'Placed: heading', 'Recently placed'], ['placed_em', 'Placed: heading (blue)', 'members'],
    ['testi_chip', 'Testimonials: label', 'Testimonials'], ['testi_title', 'Testimonials: heading', 'What our'], ['testi_em', 'Testimonials: heading (blue)', 'clients say'],
    ['news_chip', 'News: label', 'News'], ['news_title', 'News: heading', 'Latest'], ['news_em', 'News: heading (blue)', 'updates'],
    ['dual1_title', 'Online banner: heading', 'Apply for an online job'], ['dual1_text', 'Online banner: text', 'Interview and sign from home, wherever you are.'], ['dual1_btn', 'Online banner: button', 'Apply now'],
    ['dual2_title', 'Office banner: heading', 'Visit our office'], ['dual2_text', 'Office banner: text', 'Prefer to talk in person? Book a visit.'], ['dual2_btn', 'Office banner: button', 'Book a visit']]),
  ...grp('Jobs and Visa pages', [
    ['jobs_page_title', 'Jobs page: title', 'Verified jobs'], ['img_jobs_banner', 'Jobs page: banner photo', IMG_DEST1, 'i'],
    ['visa_page_title', 'Visa page: title', 'Visa services'], ['img_visa_banner', 'Visa page: banner photo', IMG_CANADA, 'i'],
    ['visa_routes_chip', 'Routes: label', 'Destinations'], ['visa_routes_title', 'Routes: heading', 'Routes by'], ['visa_routes_em', 'Routes: heading (blue)', 'destination'],
    ['visa_proc_chip', 'Process: label', 'Process'], ['visa_proc_title', 'Process: heading', 'From offer to visa in'], ['visa_proc_em', 'Process: heading (blue)', 'six steps'],
    ['visa_check_chip', 'Checklist: label', 'Checklist'], ['visa_check_title', 'Checklist: heading', 'Paperwork we'], ['visa_check_em', 'Checklist: heading (blue)', 'prepare with you'],
    ['visa_fees_chip', 'Fees: label', 'Fees'], ['visa_fees_title', 'Fees: heading', 'What you pay,'], ['visa_fees_em', 'Fees: heading (blue)', 'and when'],
    ['visa_fee_note', 'Fees: note', 'Government fees are paid directly to the authority, never to us.']]),
  ...grp('About and Contact pages', [
    ['about_page_title', 'About page: title', 'About us'], ['img_about_banner', 'About page: banner photo', IMG_TEAM, 'i'],
    ['story_chip', 'Story: label', 'Our story'], ['story_title', 'Story: heading', 'We help people work abroad,'], ['story_em', 'Story: heading (blue)', 'openly and legally'],
    ['story_text', 'Story: text', 'GoPath Legal Careers connects skilled workers with verified employers in the United States, Australia and Canada, and guides them through every permit and government form. [Add your founding story here.]', 'a'],
    ['values_chip', 'Values: label', 'Values'], ['values_title', 'Values: heading', 'What we'], ['values_em', 'Values: heading (blue)', 'stand for'],
    ['team_chip', 'Team: label', 'Team'], ['team_title', 'Team: heading', 'The people you'], ['team_em', 'Team: heading (blue)', 'will talk to'],
    ['contact_chip', 'Contact: label', 'Contact'], ['contact_title', 'Contact: heading', 'Talk'], ['contact_em', 'Contact: heading (blue)', 'to us'],
    ['contact_card_title', 'Contact card: title', 'Visit or call'], ['contact_note', 'Contact form: note', 'We never ask for money by message.'], ['img_contact', 'Contact photo', IMG_TEAM, 'i']]),
  ...grp('Sign in and footer', [
    ['login_chip', 'Sign in: label', 'Welcome back'], ['login_title', 'Sign in: heading', 'Sign in'], ['img_login', 'Sign in photo', IMG_HERO, 'i'],
    ['footer_text', 'Footer: about text', 'Jobs in the United States, Australia and Canada, with the visa and government paperwork handled.', 'a'],
    ['footer_note', 'Footer: notice', 'No fees before a verified job offer. We never ask for payment by gift card or crypto.', 'a']]),
];

// Field spec: [column, label, type, options]  type: a = long text, i = image, s = select (options)
const ICON_OPTS = [['search', 'Search'], ['document', 'Document'], ['shield', 'Shield'], ['clipboard', 'Clipboard'], ['home', 'Home']];
const SECTIONS = {
  hero_ticks: { l: 'Hero checklist', f: [['title', 'Text']] },
  about_items: { l: 'Home: about accordion', f: [['title', 'Heading'], ['body', 'Text', 'a']] },
  stats: { l: 'Home: stats bar', f: [['value', 'Number (e.g. 1,200+)'], ['title', 'Label']] },
  services: { l: 'Services', f: [['title', 'Title'], ['body', 'Description', 'a'], ['extra', 'Icon', 's', ICON_OPTS]] },
  how_steps: { l: 'Home: how it works', f: [['title', 'Step'], ['body', 'Short text']] },
  placed: { l: 'Placed members', f: [['title', 'Name'], ['extra', 'Role'], ['value', 'Destination'], ['image_url', 'Photo', 'i']] },
  testimonials: { l: 'Testimonials', f: [['body', 'Quote', 'a'], ['title', 'Client name'], ['extra', 'Role'], ['value', 'Destination'], ['image_url', 'Photo', 'i']] },
  news: { l: 'News and guides', f: [['title', 'Headline'], ['extra', 'Tag (e.g. Guide)'], ['image_url', 'Image', 'i'], ['body', 'Article text (blank line between paragraphs)', 'a']] },
  visa_steps: { l: 'Visa: six steps', f: [['title', 'Step'], ['body', 'Short text']] },
  checklist: { l: 'Visa: paperwork checklist', f: [['title', 'Document'], ['value', 'Note']] },
  fees: { l: 'Visa: fees', f: [['title', 'Item'], ['value', 'Amount']] },
  faq: { l: 'Visa: questions', f: [['title', 'Question'], ['body', 'Answer', 'a']] },
  values: { l: 'About: values', f: [['title', 'Value'], ['body', 'Text', 'a'], ['extra', 'Icon', 's', ICON_OPTS]] },
  team: { l: 'About: team', f: [['title', 'Name'], ['extra', 'Role'], ['body', 'Licence / languages'], ['image_url', 'Photo', 'i']] },
  doc_types: { l: 'Client document types', f: [['title', 'Document name']] },
};
