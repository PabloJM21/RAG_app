import { GridContainer } from "@/components/custom-ui/GridContainer";
import { Cell } from "@/components/custom-ui/Cell";


export default function DocLayout({
  indexing_results,
  indexing,
  extraction,
  retrieval,
}: {
  indexing_results: React.ReactNode;
  indexing: React.ReactNode;
  extraction: React.ReactNode;
  retrieval: React.ReactNode;
  params: { doc_id: string };
}) {
  return (
    <GridContainer>
      <Cell>{indexing_results}</Cell>
      <Cell>{indexing}</Cell>
      <Cell>{extraction}</Cell>
      <Cell bordered={false}>{retrieval}</Cell>
    </GridContainer>
  );
}


