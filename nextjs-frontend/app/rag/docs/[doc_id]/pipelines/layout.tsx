import { GridContainer } from "@/components/custom-ui/GridContainer";
import { Cell } from "@/components/custom-ui/Cell";


export default function DocLayout({
  indexing,
  extraction,
  retrieval,
}: {
  indexing: React.ReactNode;
  extraction: React.ReactNode;
  retrieval: React.ReactNode;
  params: { doc_id: string };
}) {
  return (
    <GridContainer>
      <Cell>{indexing}</Cell>
      <Cell>{extraction}</Cell>
      <Cell bordered={false}>{retrieval}</Cell>
    </GridContainer>
  );
}


