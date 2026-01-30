import ConversionPageContent from "./ConversionPageContent";
import ProcessingPageContent from "./ProcessingPageContent";


export default async function IndexingPage({
  params,
}: {
  params: Promise<{ doc_id: string }>;
}) {
  const { doc_id } = await params;

  return (
    <div className="h-screen flex flex-col">
        {/* CONTENT */}
      <div
        className="flex-1 grid overflow-hidden"
        style={{ gridTemplateRows: "1fr 1fr" }}
      >
        {/* TOP */}
        <section className="p-4 overflow-auto border-b">
          <ConversionPageContent doc_id={doc_id} />
        </section>

        {/* BOTTOM */}
        <section className="p-4 overflow-auto">
          <ProcessingPageContent doc_id={doc_id} />
        </section>


      </div>
    </div>
  );
}


