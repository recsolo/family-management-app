"use client";

import { useState, useCallback, type FormEvent } from "react";

type UseFormEditorConfig<TFields extends Record<string, unknown>> = {
  defaults: TFields;
  onSubmit: (fields: TFields, editingId: string | null) => void;
  validate?: (fields: TFields) => boolean;
};

type UseFormEditorResult<TFields extends Record<string, unknown>> = {
  fields: TFields;
  setField: <K extends keyof TFields>(key: K, value: TFields[K]) => void;
  setFields: (partial: Partial<TFields>) => void;
  editingId: string | null;
  isEditing: boolean;
  startEditing: (id: string, values: TFields) => void;
  reset: () => void;
  handleSubmit: (event: FormEvent) => void;
};

export function useFormEditor<TFields extends Record<string, unknown>>(
  config: UseFormEditorConfig<TFields>,
): UseFormEditorResult<TFields> {
  const [fields, setFieldsState] = useState<TFields>(config.defaults);
  const [editingId, setEditingId] = useState<string | null>(null);

  const setField = useCallback(<K extends keyof TFields>(key: K, value: TFields[K]) => {
    setFieldsState((current) => ({ ...current, [key]: value }));
  }, []);

  const setFields = useCallback((partial: Partial<TFields>) => {
    setFieldsState((current) => ({ ...current, ...partial }));
  }, []);

  const startEditing = useCallback((id: string, values: TFields) => {
    setEditingId(id);
    setFieldsState(values);
  }, []);

  const reset = useCallback(() => {
    setEditingId(null);
    setFieldsState(config.defaults);
  }, [config.defaults]);

  const handleSubmit = useCallback(
    (event: FormEvent) => {
      event.preventDefault();
      if (config.validate && !config.validate(fields)) {
        return;
      }
      config.onSubmit(fields, editingId);
      reset();
    },
    [fields, editingId, config, reset],
  );

  return {
    fields,
    setField,
    setFields,
    editingId,
    isEditing: editingId !== null,
    startEditing,
    reset,
    handleSubmit,
  };
}
