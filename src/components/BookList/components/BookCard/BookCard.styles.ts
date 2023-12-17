import styled from "@emotion/styled";
import { Card, CardActionArea, CardMedia, CardMediaProps } from "@mui/material";

export const CardWrapper = styled(Card)`
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  margin-bottom: 16px;
  border: 1px solid #ccc;
  border-radius: 8px;
  overflow: hidden; // Ensure child elements don't spill outside
  transition: box-shadow 0.3s ease-in-out, transform 0.5s ease-in-out; // Longer, smoother transition
  background: #f5f5f5;

  &:hover {
    box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);
    transform: translate(2px, 2px);
  }

  &:hover::before {
    content: "";
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    background: rgba(0, 0, 0, 0.1);
    transition: background 0.3s ease-in-out; // Smoothly fade in and out
  }
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
