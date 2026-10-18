import { Database, FileJson, FileText, ListPlus } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JsonIndexer } from "@/features/indexing/JsonIndexer";
import { MoviesForm } from "@/features/indexing/MoviesForm";
import { PdfUploader } from "@/features/indexing/PdfUploader";
import { StatusPanel } from "@/features/indexing/StatusPanel";
import { useIndexStatusPolling } from "@/hooks/useIndexStatusPolling";

export default function IndexPage() {
  useIndexStatusPolling(2000);

  return (
    <>
      <PageHeader
        icon={Database}
        title="Indexing"
        description="Feed movies into the Neo4j graph and the Pinecone vector index. Long jobs run in the background - the status panel updates automatically."
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <Tabs defaultValue="pdf" className="min-w-0">
          <TabsList>
            <TabsTrigger value="pdf">
              <FileText /> PDF
            </TabsTrigger>
            <TabsTrigger value="json">
              <FileJson /> JSON file
            </TabsTrigger>
            <TabsTrigger value="movies">
              <ListPlus /> Manual
            </TabsTrigger>
          </TabsList>
          <TabsContent value="pdf">
            <PdfUploader />
          </TabsContent>
          <TabsContent value="json">
            <JsonIndexer />
          </TabsContent>
          <TabsContent value="movies">
            <MoviesForm />
          </TabsContent>
        </Tabs>
        <div className="min-w-0 xl:sticky xl:top-6 xl:self-start">
          <StatusPanel />
        </div>
      </div>
    </>
  );
}
