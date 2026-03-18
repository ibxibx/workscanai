// WorkScanAI LinkedIn Bookmarklet — source (human-readable version)
// This gets minified and put into the href="javascript:..." of a drag-to-install link

(function() {
  // Only works on LinkedIn
  if (!window.location.hostname.includes('linkedin.com')) {
    alert('Please navigate to a LinkedIn profile or company page first, then click this bookmark.');
    return;
  }

  var text = document.body.innerText;
  var url = window.location.href;
  var isCompany = url.includes('/company/') || url.includes('/school/');

  // Name from h1
  var name = (document.querySelector('h1') || {}).innerText || '';
  name = name.trim();

  // Headline — find div with text-body-medium class containing pipe chars or long text
  var headline = '';
  var divs = document.querySelectorAll('div');
  for (var i = 0; i < divs.length; i++) {
    var d = divs[i];
    if (typeof d.className === 'string' && d.className.includes('text-body-medium')) {
      var t = (d.innerText || '').trim();
      if (t.length > 20 && t.length < 500) { headline = t; break; }
    }
  }

  // Section extractor — LinkedIn duplicates section headers in the DOM text
  function section(label, endLabels) {
    var marker = label + '\n' + label + '\n';
    var idx = text.indexOf(marker);
    if (idx === -1) { marker = '\n' + label + '\n'; idx = text.indexOf(marker); }
    if (idx === -1) return '';
    var start = idx + marker.length;
    var end = start + 2500;
    for (var j = 0; j < endLabels.length; j++) {
      var m2 = endLabels[j] + '\n' + endLabels[j] + '\n';
      var ei = text.indexOf(m2, start + 50);
      if (ei > start && ei < end) end = ei;
    }
    return text.slice(start, end).trim().slice(0, 1800);
  }

  var about = section('About', ['Experience','Skills','Education','Certifications']);
  var experience = section('Experience', ['Skills','Education','Certifications','Recommendations']);
  var skills = section('Skills', ['Education','Certifications','Recommendations','Interests']);

  var payload = JSON.stringify({
    type: 'workscanai_linkedin_data',
    name: name,
    headline: headline.slice(0, 300),
    about: about.slice(0, 800),
    experience: experience.slice(0, 1500),
    skills: skills.slice(0, 400),
    url: url,
    profile_type: isCompany ? 'company' : 'personal',
  });

  // Open the receiver page as a popup (WorkScanAI must already be open)
  var receiverUrl = 'https://workscanai.vercel.app/linkedin-receiver';
  var popup = window.open(receiverUrl, 'workscanai_receiver', 'width=420,height=320,scrollbars=no');

  if (!popup) {
    // Popup blocked — use hash fallback
    var hashUrl = receiverUrl + '#' + encodeURIComponent(payload);
    window.open(hashUrl, 'workscanai_receiver', 'width=420,height=320');
    return;
  }

  // Wait for receiver page to load then postMessage it
  var attempts = 0;
  var iv = setInterval(function() {
    attempts++;
    try {
      popup.postMessage(JSON.parse(payload), '*');
      clearInterval(iv);
    } catch(e) {
      if (attempts > 30) clearInterval(iv);
    }
  }, 200);
})();
