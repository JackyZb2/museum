import {Artifact, Asset, DocumentItem} from "../types";
const base=process.env.NEXT_PUBLIC_API_URL||"http://localhost:8000";
async function request<T>(path:string, options?:RequestInit):Promise<T>{const r=await fetch(`${base}/api${path}`,{...options,headers:{"Content-Type":"application/json",...(options?.headers||{})},cache:"no-store"});const body=await r.json();if(!r.ok)throw new Error(body.message||"Request failed");return body.data}
export const getArtifacts=(search="")=>request<Artifact[]>(`/artifacts${search?`?search=${encodeURIComponent(search)}`:""}`);
export const getArtifact=(id:string)=>request<Artifact>(`/artifacts/${id}`);
export const createArtifact=(data:Partial<Artifact>)=>request<Artifact>("/artifacts",{method:"POST",body:JSON.stringify({museum_id:1,...data})});
export const updateArtifact=(id:string,data:Partial<Artifact>)=>request<Artifact>(`/artifacts/${id}`,{method:"PUT",body:JSON.stringify({museum_id:1,...data})});
export const deleteArtifact=(id:number)=>request<{deleted:boolean}>(`/artifacts/${id}`,{method:"DELETE"});
export async function upload(id:string,file:File,kind:"assets"|"documents"){const form=new FormData();form.append("file",file);const r=await fetch(`${base}/api/artifacts/${id}/${kind}`,{method:"POST",body:form});const b=await r.json();if(!r.ok)throw new Error(b.detail||"Upload failed");return b.data as Asset|DocumentItem}
export const removeAsset=(id:number)=>request(`/assets/${id}`,{method:"DELETE"});export const removeDocument=(id:number)=>request(`/documents/${id}`,{method:"DELETE"});export const assetUrl=(path:string)=>`${base}/${path.replaceAll("\\","/")}`;

