'use client';

import type { FormEvent } from 'react';

export type ArtifactFormValues = {
  name: string;
  dynasty: string;
  category: string;
  material: string;
  inventory_number: string;
  description: string;
};

type ArtifactFormProps = {
  title: string;
  form: ArtifactFormValues;
  change: (key: keyof ArtifactFormValues, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  submit: string;
};

export function ArtifactForm({ title, form, change, onSubmit, submit }: ArtifactFormProps) {
  const fields: [keyof ArtifactFormValues, string][] = [
    ['name', '文物名称 *'],
    ['dynasty', '朝代'],
    ['category', '类别'],
    ['material', '材质'],
    ['inventory_number', '藏品编号'],
  ];

  return (
    <>
      <h1 className="mb-8 text-3xl font-bold">{title}</h1>
      <form onSubmit={onSubmit} className="card max-w-3xl space-y-5 p-7">
        {fields.map(([key, label]) => (
          <label className="block text-sm font-semibold" key={key}>
            {label}
            <input
              required={key === 'name'}
              className="mt-2 w-full rounded-lg border p-3 font-normal"
              value={form[key]}
              onChange={(event) => change(key, event.target.value)}
            />
          </label>
        ))}
        <label className="block text-sm font-semibold">
          文物描述
          <textarea
            className="mt-2 w-full rounded-lg border p-3 font-normal"
            rows={5}
            value={form.description}
            onChange={(event) => change('description', event.target.value)}
          />
        </label>
        <button className="button primary">{submit}</button>
      </form>
    </>
  );
}
