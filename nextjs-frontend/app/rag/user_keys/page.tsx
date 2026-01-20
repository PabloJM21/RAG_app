import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableHeader,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { fetchKeys } from "@/app/api/rag/user_keys/keys-action";
import { DeleteButton } from "./deleteButton";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function DashboardPage() {
  const keys = await fetchKeys();

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">
        Welcome to your Dashboard
      </h2>

      <p className="text-lg mb-6">
        Here, you can see the overview of your API keys and manage them.
      </p>

      <div className="mb-6">
        <Link href="/dashboard/add-key">
          <Button variant="outline" className="text-lg px-4 py-2">
            Add New Key
          </Button>
        </Link>
      </div>

      <section className="p-6 bg-white rounded-lg shadow-lg mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Keys</h2>
        </div>

        <Table className="min-w-full text-sm">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Base API</TableHead>
              <TableHead>API Key</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {!keys.length ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center">
                  No keys configured.
                </TableCell>
              </TableRow>
            ) : (
              keys.map((key, index) => (
                <TableRow key={index}>
                  <TableCell>{key.base_key}</TableCell>

                  <TableCell className="font-mono">
                    {key.api_key_encrypted}
                  </TableCell>

                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="cursor-pointer p-1 text-gray-600 hover:text-gray-800">
                        <span className="text-lg font-semibold">...</span>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent className="p-2">
                        <DropdownMenuItem disabled>
                          Edit
                        </DropdownMenuItem>
                        <DeleteButton baseKey={key.base_key} />
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}

