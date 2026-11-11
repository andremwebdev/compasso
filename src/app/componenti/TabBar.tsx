import { sections } from "../sections";
import { currentSection } from "../state";

/** Barra in basso con le cinque sezioni. */
export function TabBar() {
  return (
    <nav class="tab-bar" aria-label="Sezioni">
      {sections.map((section) => {
        const active = currentSection.value === section.id;
        return (
          <button
            key={section.id}
            type="button"
            class={active ? "tab tab-active" : "tab"}
            aria-current={active ? "page" : undefined}
            onClick={() => {
              currentSection.value = section.id;
            }}
          >
            {section.label}
          </button>
        );
      })}
    </nav>
  );
}
