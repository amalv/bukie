import styled from "@emotion/styled";
import { Card, CardActionArea, CardMedia, CardMediaProps } from "@mui/material";

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

export const InfoWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;
export const TextWrapper = styled.div`
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
