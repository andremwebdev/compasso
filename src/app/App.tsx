import { TabBar } from "./componenti/TabBar";
import { LessonView } from "./schermate/LessonView";
import { Practice } from "./schermate/Practice";
import { Esercizi, Oggi, Teoria, Test, Tu } from "./schermate/Sections";
import { currentSection, screen } from "./state";

/** La pagina iniziale della sezione aperta. */
function SectionHome() {
  switch (currentSection.value) {
    case "oggi":
      return <Oggi />;
    case "teoria":
      return <Teoria />;
    case "esercizi":
      return <Esercizi />;
    case "test":
      return <Test />;
    case "tu":
      return <Tu />;
  }
}

export function App() {
  const current = screen.value;
  return (
    <>
      <main class="page">
        {current.kind === "home" && <SectionHome />}
        {current.kind === "lesson" && <LessonView key={current.code} code={current.code} />}
        {current.kind === "practice" && <Practice key={`${current.generator}-${current.levels.join("")}-${current.context}`} plan={current} />}
      </main>
      <TabBar />
    </>
  );
}
