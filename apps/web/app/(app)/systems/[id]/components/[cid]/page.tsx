import { ComponentEditor } from '@/components/system/ComponentEditor';

export default function Page({ params }: { params: { cid: string } }) {
  return <ComponentEditor cid={params.cid} />;
}
