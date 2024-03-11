import {
  Card,
  CardActionArea,
  CardMedia,
  type CardMediaProps,
} from "@mui/material";
import { styled } from "@mui/material/styles";

export const CardWrapper = styled(Card)(
  ({ theme }) => `
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  margin-bottom: 16px;
  border: 1px solid ${theme.palette.divider};
  border-radius: 8px;
  transition: box-shadow 0.3s ease-in-out, transform 0.5s ease-in-out;
  background: ${
    theme.palette.mode === "dark" ? "#333" : theme.palette.background.paper
  };

  &:hover {
    box-shadow: 0 3px 6px ${theme.palette.action.hover};
    transform: translate(2px, 2px);
  }

  &:active::before {
    content: "";
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    background: ${theme.palette.action.selected};
    transition: background 0.3s ease-in-out;
  }
`,
);

export const Cover = styled(CardMedia)<CardMediaProps>`
  height: 216px;
  object-fit: fill;
  border-radius: 8px;
  margin-bottom: 8px;
`;

export const InfoWrapper = styled("div")`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;
export const TextWrapper = styled("div")`
  display: flex;
  flex-direction: column;
  justify-content: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-grow: 1;
`;

export const CardActionAreaWrapper = styled(CardActionArea)`
  padding: 8px;
`;
