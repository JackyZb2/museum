'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArtifactForm, type ArtifactFormValues } from '../../../../components/ArtifactForm';
import { getArtifact, updateArtifact } from '../../../../lib/api';
import { Artifact } from '../../../../types';
export default function Edit() {
  const p = useParams<{ id: string }>(),
    r = useRouter();
  const [form, setForm] = useState<ArtifactFormValues | null>(null);
  useEffect(() => {
    getArtifact(p.id).then((a) =>
      setForm({
        name: a.name,
        dynasty: a.dynasty || '',
        category: a.category || '',
        material: a.material || '',
        inventory_number: a.inventory_number || '',
        description: a.description || '',
      }),
    );
  }, [p.id]);
  if (!form) return <div className="muted">正在加载……</div>;
  return (
    <ArtifactForm
      title="编辑文物"
      form={form}
      change={(k, v) => setForm({ ...form, [k]: v })}
      onSubmit={async (e) => {
        e.preventDefault();
        await updateArtifact(p.id, form);
        r.push(`/artifacts/${p.id}`);
      }}
      submit="保存修改"
    />
  );
}
