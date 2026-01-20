import { GridContainer } from "@/components/custom-ui/GridContainer";
import { Cell } from "@/components/custom-ui/Cell";


export default function DocLayout({
  indexing_results,
}: {
  indexing_results: React.ReactNode;
  params: { doc_id: string };
}) {
  return (
    <GridContainer>
      <Cell>{indexing_results}</Cell>
    </GridContainer>
  );
}


