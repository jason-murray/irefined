let irefBootstrap = setInterval(() => {
    let head = document.getElementsByTagName('head')[0];
    
    if (head) {
        clearInterval(irefBootstrap);
        let link = document.createElement("link");
        link.type = "text/css";
        link.rel = "stylesheet";
        link.href = "https://jason-murray.github.io/irefined/extension.css?" + new Date().getTime();
        head.appendChild(link);
    
        let script = document.createElement('script');
        script.src = "https://jason-murray.github.io/irefined/main.js?" + new Date().getTime();
        script.type = 'module';
        head.appendChild(script);
    }
}, 100);