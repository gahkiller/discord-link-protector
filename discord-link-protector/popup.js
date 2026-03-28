const getInput = (id) => document.getElementById(id);

getInput("addWhitelist").onclick = () => {
  const domain = getInput("whitelistDomain").value.trim();
  if (!domain) return;
  chrome.storage.sync.get(["customWhitelist"], (data) => {
    const whitelist = data.customWhitelist || [];
    if (!whitelist.includes(domain)) whitelist.push(domain);
    chrome.storage.sync.set({customWhitelist: whitelist}, () => {
      alert(domain + " added to whitelist!");
    });
  });
};

getInput("addSuspicious").onclick = () => {
  const domain = getInput("suspiciousDomain").value.trim();
  if (!domain) return;
  chrome.storage.sync.get(["customDomains"], (data) => {
    const customDomains = data.customDomains || [];
    if (!customDomains.includes(domain)) customDomains.push(domain);
    chrome.storage.sync.set({customDomains: customDomains}, () => {
      alert(domain + " added to custom suspicious domains!");
    });
  });
};

// Settings (example saving HTTP warning and fuzzy level)
getInput("httpWarning").onchange = (e) => {
  chrome.storage.sync.set({httpWarning: e.target.checked});
};

getInput("fuzzyLevel").onchange = (e) => {
  chrome.storage.sync.set({fuzzyLevel: parseInt(e.target.value)});
};