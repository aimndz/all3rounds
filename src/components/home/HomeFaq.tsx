import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ_ITEMS = [
  {
    question: "What is All3Rounds?",
    answer:
      "All3Rounds is a community-driven archive for Filipino battle rap featuring searchable transcripts, battle history, and emcee profiles. Built to make discovering and contributing to the scene easier for everyone.",
  },
  {
    question: "How are the battle transcripts created?",
    answer:
      "Transcripts begin as AI-generated drafts which are then manually reviewed and refined by the community to ensure better accuracy.",
  },
  {
    question: "Does All3Rounds host the battle videos?",
    answer:
      "No. All videos are embedded directly from the leagues' official YouTube channels. This ensures that all views go directly to the original creators while we provide the search and transcription layer.",
  },
  {
    question: "How can I help improve transcript accuracy?",
    answer:
      "You can help improve the archive by reviewing transcript lines in the 'Discover' section or contributing to transcripts directly on battle pages. Every correction helps make the archive more accurate for the community.",
  },
  {
    question: "Is All3Rounds affiliated with any league?",
    answer:
      "No. All3Rounds is an independent educational project. We are not affiliated with, endorsed by, or sponsored by FlipTop or any other battle rap league.",
  },
  {
    question: "Will the archive expand to other battle rap leagues?",
    answer:
      "Yes. While the archive is currently optimized for FlipTop Battle League content, we plan to include other leagues as the platform grows and more transcripts are reviewed.",
  },
] as const;

export default function HomeFaq() {
  return (
    <div>
      <Accordion type="single" collapsible>
        {FAQ_ITEMS.map((item, index) => (
          <AccordionItem key={item.question} value={`item-${index}`}>
            <AccordionTrigger>{item.question}</AccordionTrigger>
            <AccordionContent>{item.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
