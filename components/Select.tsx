"use client";

import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type SelectHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import { useLanguage } from "./LanguageProvider";
import { translateInterface } from "@/lib/translations";
import styles from "./Select.module.css";

type Option = { value: string; label: string; disabled: boolean };

/** A single-select with a native form bridge and a fully styled, keyboard-operated popup. */
export function Select({
  children,
  className = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  const { language } = useLanguage();
  const translate = (text: string) =>
    language === "kn" ? translateInterface(text) : text;
  const options: Option[] = Children.toArray(children).flatMap((child) => {
    if (
      !isValidElement<{
        value?: string;
        children?: string;
        disabled?: boolean;
      }>(child)
    )
      return [];
    const label = String(child.props.children ?? "");
    return [
      {
        value: String(child.props.value ?? label),
        label,
        disabled: !!child.props.disabled,
      },
    ];
  });
  const uid = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const native = useRef<HTMLSelectElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [position, setPosition] = useState<CSSProperties>({});
  const [uncontrolled, setUncontrolled] = useState(
    String(props.defaultValue ?? options[0]?.value ?? ""),
  );
  const value = String(props.value ?? uncontrolled);
  const selected =
    options.find((option) => option.value === value) ?? options[0];
  const filtered = options.filter(
    (option) =>
      !option.disabled &&
      translate(option.label)
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase()),
  );
  const searchable = options.length > 6;
  const typeahead = useRef({ text: "", time: 0 });

  const close = (restore = false) => {
    setOpen(false);
    if (restore) trigger.current?.focus();
  };
  const show = () => {
    if (props.disabled) return;
    setQuery("");
    setActive(
      Math.max(
        0,
        options
          .filter((option) => !option.disabled)
          .findIndex((option) => option.value === value),
      ),
    );
    setOpen(true);
  };
  const choose = (option: Option) => {
    if (!native.current) return;
    native.current.value = option.value;
    native.current.dispatchEvent(new Event("change", { bubbles: true }));
    setUncontrolled(option.value);
    close(true);
  };

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      const below = window.innerHeight - rect.bottom - 12;
      const above = rect.top - 12;
      const up = below < 260 && above > below;
      const width = Math.min(
        Math.max(rect.width, searchable ? 280 : 220),
        window.innerWidth - 24,
      );
      setPosition({
        position: "fixed",
        width,
        left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
        top: up ? undefined : rect.bottom + 8,
        bottom: up ? window.innerHeight - rect.top + 8 : undefined,
        maxHeight: Math.min(370, up ? above : below),
      });
    };
    place();
    const outside = (event: PointerEvent) => {
      if (
        !popup.current?.contains(event.target as Node) &&
        !trigger.current?.contains(event.target as Node)
      )
        setOpen(false);
    };
    const focus = (event: FocusEvent) => {
      if (
        !popup.current?.contains(event.target as Node) &&
        !trigger.current?.contains(event.target as Node)
      )
        setOpen(false);
    };
    const observer = new ResizeObserver(place);
    if (trigger.current) observer.observe(trigger.current);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", focus);
    search.current?.focus();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", focus);
    };
  }, [open, searchable]);

  useEffect(() => {
    if (!open || !list.current) return;
    const option = document.getElementById(`${uid}-option-${active}`);
    if (!option) return;
    // Only scroll the option list; scrolling an unpositioned portal can jump
    // the entire page to the footer when the menu first opens.
    const item = option.getBoundingClientRect();
    const viewport = list.current.getBoundingClientRect();
    if (item.top < viewport.top)
      list.current.scrollTop -= viewport.top - item.top;
    else if (item.bottom > viewport.bottom)
      list.current.scrollTop += item.bottom - viewport.bottom;
  }, [open, active, uid]);

  const keys = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close(true);
      return;
    }
    if (event.key === "Tab") {
      if (open) {
        trigger.current?.focus();
        close();
      }
      return;
    }
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      if (!open && (event.key === "Home" || event.key === "End")) return;
      event.preventDefault();
      if (!open) {
        show();
        return;
      }
      setActive((index) =>
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? Math.max(0, filtered.length - 1)
            : Math.max(
                0,
                Math.min(
                  filtered.length - 1,
                  index + (event.key === "ArrowDown" ? 1 : -1),
                ),
              ),
      );
    } else if (
      event.key === "Enter" ||
      (event.key === " " && event.target !== search.current)
    ) {
      event.preventDefault();
      if (open && filtered[active]) choose(filtered[active]);
      else show();
    } else if (open && !searchable && event.key.length === 1) {
      event.preventDefault();
      const now = event.timeStamp;
      typeahead.current.text =
        (now - typeahead.current.time < 700 ? typeahead.current.text : "") +
        event.key.toLowerCase();
      typeahead.current.time = now;
      const index = filtered.findIndex((option) =>
        translate(option.label)
          .toLocaleLowerCase()
          .startsWith(typeahead.current.text),
      );
      if (index >= 0) setActive(index);
    }
  };
  const label = translate(
    props["aria-label"] ??
      (props.id === "department"
        ? "Responsible department"
        : props.id === "status"
          ? "Case status"
          : "Choose an option"),
  );
  const tone = (optionValue: string) =>
    [
      "Critical",
      "High",
      "Medium",
      "Low",
      "Resolved",
      "Reported",
      "Assigned",
      "In Progress",
    ].includes(optionValue)
      ? optionValue.toLowerCase().replaceAll(" ", "-")
      : undefined;

  return (
    <span
      className={`modern-select ${styles.root} ${className}`}
      data-no-translate
    >
      <select
        {...props}
        id={undefined}
        aria-label={undefined}
        aria-hidden="true"
        tabIndex={-1}
        className={styles.native}
        ref={native}
      >
        {children}
      </select>
      <button
        ref={trigger}
        id={props.id}
        type="button"
        className={styles.trigger}
        disabled={props.disabled}
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? `${uid}-list` : undefined}
        aria-haspopup="listbox"
        aria-activedescendant={
          open && !searchable && filtered[active]
            ? `${uid}-option-${active}`
            : undefined
        }
        onClick={() => (open ? close() : show())}
        onKeyDown={keys}
      >
        {tone(value) && <i className={styles.dot} data-tone={tone(value)} />}
        <span>{translate(selected?.label ?? "Choose an option")}</span>
        <ChevronDown size={15} className={styles.chevron} />
      </button>
      {open &&
        createPortal(
          <div
            ref={popup}
            className={styles.popup}
            style={position}
            onKeyDown={keys}
            data-no-translate
          >
            <div className={styles.caption}>
              {label}
              <span>{filtered.length}</span>
            </div>
            {searchable && (
              <div className={styles.search}>
                <Search size={15} />
                <input
                  ref={search}
                  value={query}
                  role="combobox"
                  aria-label={translate("Search options")}
                  aria-controls={`${uid}-list`}
                  aria-expanded="true"
                  aria-autocomplete="list"
                  aria-activedescendant={
                    filtered[active] ? `${uid}-option-${active}` : undefined
                  }
                  placeholder={translate("Search options…")}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setActive(0);
                  }}
                />
              </div>
            )}
            <div
              ref={list}
              id={`${uid}-list`}
              role="listbox"
              aria-label={label}
              className={styles.list}
            >
              {filtered.map((option, index) => (
                <div
                  key={option.value}
                  id={`${uid}-option-${index}`}
                  role="option"
                  aria-selected={option.value === value}
                  className={`${styles.option} ${index === active ? styles.active : ""}`}
                  onPointerMove={() => setActive(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(option)}
                >
                  {tone(option.value) && (
                    <i className={styles.dot} data-tone={tone(option.value)} />
                  )}
                  <span>{translate(option.label)}</span>
                  {value === option.value && <Check size={15} />}
                </div>
              ))}
              {!filtered.length && (
                <div className={styles.empty}>
                  {translate("No matching options")}
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </span>
  );
}
