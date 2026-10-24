import React from "react";
import PageHeader from "../components/shared/PageHeader";
import EmptyState from "../components/shared/EmptyState";
import { Construction } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  description?: string;
  slice: string;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title, description, slice }) => {
  return (
    <div>
      <PageHeader
        title={title}
        description={description || `HCM Lite ${title} management section.`}
      />
      <EmptyState
        title={`${title} Screen`}
        message={`This screen is configured in routing and shell. Feature implementation scheduled for slice ${slice}.`}
        icon={Construction}
        hint="Foundation and role guards active."
      />
    </div>
  );
};

export default PlaceholderPage;
