"""Local MOCK proof of the production Vue/PrimeVue artifact, never an Orca test."""
from pathlib import Path
import json
import re
import subprocess
import tempfile

root = Path(__file__).resolve().parent.parent
evidence = root / "evidence"
evidence.mkdir(exist_ok=True)
html = (root / "dist/index.html").read_text()
probe = """<script>setTimeout(async()=>{
 const wait=()=>new Promise(r=>setTimeout(r,400));
 const find=t=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===t);
 const b=find('Vincular a T1'),s=getComputedStyle(b);
 const result={buttonBackground:s.backgroundColor,buttonColor:s.color,radius:s.borderRadius,font:s.fontSize,
 overflow:document.documentElement.scrollWidth>innerWidth,primeButtons:document.querySelectorAll('.p-button').length};
 b.click();await wait();
 const dialog=document.querySelector('[role=dialog]');result.dialogOpened=!!dialog;
 const confirm=[...dialog.querySelectorAll('button')].find(b=>b.textContent.trim()==='Vincular a T1');
 confirm.click();await wait();
 result.confirmationCompleted=document.body.textContent.includes('Vínculo simulado concluído.');
 result.dialogClosed=!document.querySelector('[role=dialog]');
 const p=document.createElement('pre');p.id='ui-proof';p.hidden=true;p.textContent=JSON.stringify(result);document.body.append(p);
},500)</script>"""
page = evidence / "probe.html"
page.write_text(html.replace("</body>", probe + "</body>"))
chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
results = []
for theme, width in [("light", 1280), ("dark", 1280), ("dark", 720)]:
    with tempfile.TemporaryDirectory(prefix="orca-primevue-") as profile:
        common = [chrome, "--headless=new", "--use-mock-keychain", "--password-store=basic",
                  "--disable-gpu", "--disable-background-networking", "--hide-scrollbars", "--no-first-run",
                  "--force-prefers-reduced-motion", f"--user-data-dir={profile}",
                  "--virtual-time-budget=3000", f"--window-size={width},900"]
        url = page.as_uri() + "?theme=" + theme
        run = subprocess.run(common + ["--dump-dom", url], capture_output=True, text=True, timeout=60)
        stem = evidence / f"probe-{theme}-{width}"
        stem.with_suffix(".html").write_text(run.stdout)
        stem.with_suffix(".log").write_text(run.stderr)
        match = re.search(r'<pre id="ui-proof" hidden="">(.*?)</pre>', run.stdout)
        assert run.returncode == 0 and match, f"Probe failed: {theme} {width}"
        data = json.loads(match.group(1))
        results.append({"theme": theme, "width": width, **data})
        print(theme, width, json.dumps(data))
        assert data["dialogOpened"] and data["dialogClosed"] and data["confirmationCompleted"]
        assert not data["overflow"] and data["font"] == "14px" and data["radius"] == "6px"
        run = subprocess.run(common + [f"--screenshot={evidence}/MOCK-primevue-{theme}-{width}.png", url],
                             capture_output=True, text=True, timeout=60)
        (evidence / f"render-{theme}-{width}.log").write_text(run.stdout + run.stderr)
        assert run.returncode == 0
(evidence / "results.json").write_text(json.dumps(results, indent=2) + "\n")
