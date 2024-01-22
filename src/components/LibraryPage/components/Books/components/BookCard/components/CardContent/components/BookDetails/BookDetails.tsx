import { Typography } from "@mui/material";

interface BookDetailsProps {
  title: string;
  author: string;
  publicationDate: string;
}

const getYear = (dateString: string): string => {
  const date = new Date(dateString);
  return date.getFullYear().toString();
};

export const BookDetails: React.FC<BookDetailsProps> = ({
  title,
  author,
  publicationDate,
}) => (
  <>
    <Typography
      variant="subtitle2"
      fontWeight={700}
      textOverflow="ellipsis"
      overflow="hidden"
      whiteSpace="nowrap"
    >
      {title}
    </Typography>
    <Typography
      variant="subtitle2"
      color="textSecondary"
      fontStyle="italic"
      textOverflow="ellipsis"
      overflow="hidden"
      whiteSpace="nowrap"
    >
      {author}
    </Typography>
    <Typography
      variant="caption"
      color="textSecondary"
      textOverflow="ellipsis"
      overflow="hidden"
      whiteSpace="nowrap"
    >
      {getYear(publicationDate)}
    </Typography>
  </>
);
