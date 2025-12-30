(async () => {
  await I18N.init();
  await I18N.apply(document);
  await I18N.bindLanguageSelectors(document);

  document.getElementById("open").addEventListener("click", async () => {
    await chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
    window.close();
  });
})();
