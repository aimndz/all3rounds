export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-6 py-12">
      <div className="flex flex-col items-center text-center">
        {/* Big Visual 404 Area */}
        <div className="relative mb-2 select-none">
          <h1 className="text-hiphop text-[150px] leading-none opacity-[0.1] sm:text-[240px]">
            404
          </h1>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="bg-primary text-primary-foreground mb-4 flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-[10px] font-black tracking-tighter uppercase sm:text-xs">
              Line Not Found
            </div>
            <h2 className="text-hiphop text-5xl tracking-tighter sm:text-7xl">
              TIME! TIME!
            </h2>
          </div>
        </div>
      </div>
    </main>
  );
}
