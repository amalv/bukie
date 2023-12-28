import {
  Card,
  CardActionArea,
  CardMedia,
  CardMediaProps,
  TextField,
} from "@mui/material";
import { styled } from "@mui/material/styles";

export const Root = styled("div")(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  backgroundColor: theme.palette.background.default,
  color: theme.palette.text.primary,
  width: "100%",
  minHeight: "100vh",
  margin: 0,
}));

export const StyledTextField = styled(TextField)(({ theme }) => {
  return `
      .MuiInputBase-input {
        background-color: ${
          theme.palette?.mode === "dark"
            ? "rgba(255, 255, 255, 0.15)"
            : undefined
        };
        color: ${theme.palette?.mode === "dark" ? "#fff" : undefined};
        &::placeholder {
          color: ${
            theme.palette?.mode === "dark"
              ? "rgba(255, 255, 255, 0.5)"
              : undefined
          };
        }
      }
    `;
});
export const CardWrapper = styled(Card)`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  margin-bottom: 16px;
  border: 1px solid #ccc;
  border-radius: 8px;
`;

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
