'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArtifactForm, type ArtifactFormValues } from '../../../components/ArtifactForm';
import { createArtifact } from '../../../lib/api';

export default function New() {
  const r = useRouter();
  const [form, setForm] = useState<ArtifactFormValues>({
    name: '',
    dynasty: '',
    category: '',
    material: '',
    inventory_number: '',
    description: '',
  });
  const change = (k: keyof ArtifactFormValues, v: string) => setForm({ ...form, [k]: v });
  return (
    <ArtifactForm
      title="新建文物"
      form={form}
      change={change}
      onSubmit={async (e) => {
        e.preventDefault();
        const a = await createArtifact(form);
        r.push(`/artifacts/${a.id}`);
      }}
      submit="创建文物"
    />
  );
}
