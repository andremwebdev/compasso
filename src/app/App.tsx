import { TabBar } from "./componenti/TabBar";
import { LessonView } from "./schermate/LessonView";
import { Practice } from "./schermate/Practice";
import { Esercizi } from "./schermate/Esercizi";
import { FlashcardsScreen, ProofScreen } from "./schermate/Ripasso";
import { Oggi } from "./schermate/Oggi";
import { DiaryScreen, MasteryScreen, Test, Tu } from "./schermate/Tu";
import { GlossaryView, ModuleView, TeoriaHome, VolumeView } from "./schermate/Teoria";
import { currentSection, dataProblem, screen, updateReady } from "./state";

/** La pagina iniziale della sezione aperta. */
function SectionHome() {
  switch (currentSection.value) {
    case "oggi":
      return <Oggi />;
    case "teoria":
      return <TeoriaHome />;
    case "esercizi":
      return <Esercizi />;
    case "test":
      return <Test />;
    case "tu":
      return <Tu />;
  }
}

/** La schermata aperta dentro la sezione. */
function CurrentScreen() {
  const current = screen.value;
  switch (current.kind) {
    case "home":
      return <SectionHome />;
    case "volume":
      return <VolumeView code={current.code} />;
    case "module":
      return <ModuleView code={current.code} />;
    case "lesson":
      return <LessonView key={current.code} code={current.code} />;
    case "glossary":
      return <GlossaryView />;
    case "practice":
      return <Practice key={current.key} plan={current.plan} />;
    case "flashcards":
      return <FlashcardsScreen key={current.cards.join(",")} title={current.title} cards={current.cards} />;
    case "proof":
      return <ProofScreen key={current.theorem} lesson={current.lesson} theorem={current.theorem} />;
    case "mastery":
      return <MasteryScreen />;
    case "diary":
      return <DiaryScreen />;
  }
}

export function App() {
  return (
    <>
      <main class="page">
        {updateReady.value && (
          <p class="update-banner" role="status">
            Versione nuova disponibile: la userai dalla prossima apertura dell'app. I progressi restano.
          </p>
        )}
        {dataProblem.value && (
          <p class="answer-problem" role="alert">
            {dataProblem.value}
          </p>
        )}
        <CurrentScreen />
      </main>
      <TabBar />
    </>
  );
}
