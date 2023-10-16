import styled from "@emotion/styled";
import { Card, CardMedia, CardMediaProps } from "@mui/material";
export const Root = styled.div`
  display: flex;
  justify-self: center;
  align-items: center;
`;

export const CardWrapper = styled(Card)`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: 80%;
  margin: 0 auto;
  margin-bottom: 36px;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 8px;
`;

export const Cover = styled(CardMedia)<CardMediaProps>`
  height: auto;
  width: 100%;
  margin-bottom: 4px;
  border-radius: 8px;
`;
