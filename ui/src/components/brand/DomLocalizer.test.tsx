import { act, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = { locale: "fr" as string };
vi.mock("@/i18n", () => ({ useI18n: () => ({ locale: state.locale }) }));

import { DomLocalizer } from "./DomLocalizer";

const flush = async () => {
  for (let i = 0; i < 5; i++) await act(() => new Promise((r) => setTimeout(r, 0)));
};

function Upstream() {
  const [saving, setSaving] = useState(false);
  return (
    <div>
      <h1>Provider Connections</h1>
      <p>Add multiple accounts from any provider, including Dograh.</p>
      <input placeholder="Enter model name" />
      <a href="https://docs.dograh.com/configurations/inference-providers">Learn more</a>
      <code>window.DograhWidget.start()</code>
      <button onClick={() => setSaving(true)}>{saving ? "Saving..." : "Save"}</button>
    </div>
  );
}

describe("DomLocalizer", () => {
  beforeEach(() => {
    state.locale = "fr";
  });

  it("translates upstream screens and follows React updates", async () => {
    render(
      <>
        <DomLocalizer />
        <Upstream />
      </>,
    );
    await waitFor(() => expect(screen.getByRole("heading").textContent).toBe("Connexions fournisseurs"));
    expect(document.body.textContent).toContain("AiLunaPro");
    expect(document.body.textContent).not.toMatch(/including Dograh/);
    expect(screen.getByRole("textbox").getAttribute("placeholder")).not.toBe("Enter model name");
    expect((screen.getByText(/En savoir plus|Learn more/) as HTMLElement).style.display).toBe("none");
    expect(document.querySelector("code")?.textContent).toBe("window.DograhWidget.start()");

    const button = screen.getByRole("button");
    expect(button.textContent).toBe("Enregistrer");
    await act(async () => button.click());
    await flush();
    expect(button.textContent).toBe("Enregistrement...");
  });

  it("restores English when the language switches back", async () => {
    const { rerender } = render(
      <>
        <DomLocalizer />
        <Upstream />
      </>,
    );
    await waitFor(() => expect(screen.getByRole("heading").textContent).toBe("Connexions fournisseurs"));

    state.locale = "en";
    rerender(
      <>
        <DomLocalizer />
        <Upstream />
      </>,
    );
    await waitFor(() => expect(screen.getByRole("heading").textContent).toBe("Provider Connections"));
    expect(document.body.textContent).toContain("including AiLunaPro");
  });
});
