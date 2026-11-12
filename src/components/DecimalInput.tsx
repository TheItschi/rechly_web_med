"use client";

import { InputNumber, type InputNumberProps } from "antd";
import { useLanguage } from "@/contexts/LanguageContext";
import { parseDecimalInput } from "@/lib/decimalInput";

/** Comma and dot input work independently of the browser/keyboard locale. */
export default function DecimalInput(props: Omit<InputNumberProps<number>, "parser" | "formatter" | "decimalSeparator" | "stringMode">) {
    const { language } = useLanguage();
    return <InputNumber<number> {...props} inputMode="decimal" decimalSeparator={language === "de" ? "," : "."}
        // rc-input-number uses an empty string to clear its value; its public
        // parser type only declares number even though this sentinel is supported.
        parser={(value) => value?.trim() ? parseDecimalInput(value) : ("" as unknown as number)} />;
}
