export interface CartItemRequest {
seatId?: string;
}
export interface CartItemResponse {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  totalAmount: number;
  seat?: string | null;

}