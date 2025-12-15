let irefBootstrap = setInterval(() => {
    let head = document.getElementsByTagName('head')[0];
    let iracingRoot = document.querySelector('#app'); // iRacing's React root

    if (head && iracingRoot) {
        clearInterval(irefBootstrap);

        // Create Vue mount point after iRacing app
        let vueAppDiv = document.createElement('div');
        vueAppDiv.id = 'irefined-app';
        iracingRoot.parentNode.insertBefore(vueAppDiv, iracingRoot.nextSibling);

        // Load CSS
        let link = document.createElement("link");
        link.type = "text/css";
        link.rel = "stylesheet";
        link.href = "https://jason-murray.github.io/irefined/extension.css?" + new Date().getTime();
        head.appendChild(link);

        // Load main features script
        let script = document.createElement('script');
        script.src = "https://jason-murray.github.io/irefined/main.js?" + new Date().getTime();
        script.type = 'module';
        head.appendChild(script);

        // Load Vue app script
        let vueScript = document.createElement('script');
        vueScript.src = "https://jason-murray.github.io/irefined/vue.js?" + new Date().getTime();
        vueScript.type = 'module';
        head.appendChild(vueScript);

        console.log('[iRefined] Bootstrap complete - Vue mount point created');
    }
}, 100);