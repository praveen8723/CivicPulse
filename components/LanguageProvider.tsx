"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { translateInterface } from "@/lib/translations";

export type Language = "en" | "kn";
const STORAGE_KEY = "civicpulse-language";
const LanguageContext = createContext<{
  language: Language;
  setLanguage: (language: Language) => void;
} | null>(null);

const textSource = new WeakMap<Text, string>();
const textRendered = new WeakMap<Text, string>();
const attributeSource = new WeakMap<Element, Map<string, string>>();
const attributeRendered = new WeakMap<Element, Map<string, string>>();
const translatedAttributes = ["aria-label", "placeholder", "title", "alt"];

function skipText(node: Text) {
  return !!node.parentElement?.closest(
    "script, style, noscript, textarea, [data-no-translate]",
  );
}

function translateTextNode(node: Text, language: Language) {
  if (skipText(node)) return;
  const current = node.data;
  let original = textSource.get(node);
  if (
    original === undefined ||
    (current !== original && current !== textRendered.get(node))
  ) {
    original = current;
    textSource.set(node, original);
  }
  const next = language === "kn" ? translateInterface(original) : original;
  textRendered.set(node, next);
  if (current !== next) node.data = next;
}

function translateAttributes(element: Element, language: Language) {
  if (element.closest("[data-no-translate]")) return;
  const sources = attributeSource.get(element) ?? new Map<string, string>();
  const rendered = attributeRendered.get(element) ?? new Map<string, string>();
  for (const name of translatedAttributes) {
    const current = element.getAttribute(name);
    if (current === null) continue;
    let original = sources.get(name);
    if (
      original === undefined ||
      (current !== original && current !== rendered.get(name))
    ) {
      original = current;
      sources.set(name, original);
    }
    const next = language === "kn" ? translateInterface(original) : original;
    rendered.set(name, next);
    if (current !== next) element.setAttribute(name, next);
  }
  attributeSource.set(element, sources);
  attributeRendered.set(element, rendered);
}

function translateTree(root: Node, language: Language) {
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root as Text, language);
    return;
  }
  if (
    root.nodeType !== Node.ELEMENT_NODE &&
    root.nodeType !== Node.DOCUMENT_NODE
  )
    return;
  if (root instanceof Element) {
    if (root.closest("[data-no-translate]")) return;
    if (root instanceof HTMLOptionElement && !root.hasAttribute("value")) {
      root.setAttribute("value", root.value);
    }
    translateAttributes(root, language);
  }
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
  );
  let node = walker.nextNode();
  while (node) {
    if (node.nodeType === Node.TEXT_NODE)
      translateTextNode(node as Text, language);
    else if (node instanceof Element) {
      if (node instanceof HTMLOptionElement && !node.hasAttribute("value"))
        node.setAttribute("value", node.value);
      translateAttributes(node, language);
    }
    node = walker.nextNode();
  }
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "kn") setLanguage("kn");
    const sync = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY)
        setLanguage(event.newValue === "kn" ? "kn" : "en");
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  useEffect(() => {
    document.documentElement.lang = language === "kn" ? "kn" : "en";
    localStorage.setItem(STORAGE_KEY, language);
    translateTree(document.body, language);
    if (language === "en") return;
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "characterData")
          translateTree(record.target, language);
        else if (record.type === "attributes")
          translateAttributes(record.target as Element, language);
        else
          for (const node of record.addedNodes) translateTree(node, language);
      }
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: translatedAttributes,
    });
    return () => observer.disconnect();
  }, [language]);
  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("LanguageProvider missing");
  return value;
}
