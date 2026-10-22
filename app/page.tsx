import TechPackForm from "@/components/TechPackForm";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">TechPack AI</h1>
      <p className="mt-2 mb-8 text-zinc-600 dark:text-zinc-400">
        Upload a sketch, add a few details, and get a draft tech pack for your
        factory in minutes.
      </p>
      <TechPackForm />
    </main>
  );
}
