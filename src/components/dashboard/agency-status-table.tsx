"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface AgencyStat {
  agencyId: string;
  agencyName: string | null;
  total: number;
  completed: number;
  pending: number;
  cancelled: number;
  working: number;
  autopayPending: number;
}

export function AgencyStatusTable({ data }: { data: AgencyStat[] }) {
  const totalAll = data.reduce((s, r) => s + Number(r.total), 0);
  const completedAll = data.reduce((s, r) => s + Number(r.completed), 0);
  const pendingAll = data.reduce((s, r) => s + Number(r.pending), 0);
  const workingAll = data.reduce((s, r) => s + Number(r.working), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>거래처별 개통현황</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>거래처</TableHead>
              <TableHead className="text-center">전체</TableHead>
              <TableHead className="text-center">개통완료</TableHead>
              <TableHead className="text-center">대기</TableHead>
              <TableHead className="text-center">취소</TableHead>
              <TableHead className="text-center">진행중</TableHead>
              <TableHead className="text-center">자동이체 미등록</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.agencyId}>
                <TableCell>
                  <Link
                    href={`/activations?agency=${row.agencyId}`}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    {row.agencyName || row.agencyId}
                  </Link>
                </TableCell>
                <TableCell className="text-center font-bold">
                  {row.total}
                </TableCell>
                <TableCell className="text-center">
                  <Badge className="bg-green-100 text-green-800">
                    {row.completed}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge className="bg-yellow-100 text-yellow-800">
                    {row.pending}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  {Number(row.cancelled) > 0 ? (
                    <Badge className="bg-red-100 text-red-800">
                      {row.cancelled}
                    </Badge>
                  ) : (
                    <span className="text-gray-300">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {Number(row.working) > 0 ? (
                    <Badge className="bg-blue-100 text-blue-700">
                      {row.working}
                    </Badge>
                  ) : (
                    <span className="text-gray-300">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {Number(row.autopayPending) > 0 ? (
                    <Badge variant="outline" className="text-orange-600 border-orange-300">
                      {row.autopayPending}
                    </Badge>
                  ) : (
                    <span className="text-gray-300">-</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {/* 합계 행 */}
            <TableRow className="bg-gray-50 font-bold">
              <TableCell>합계</TableCell>
              <TableCell className="text-center">{totalAll}</TableCell>
              <TableCell className="text-center text-green-700">
                {completedAll}
              </TableCell>
              <TableCell className="text-center text-yellow-700">
                {pendingAll}
              </TableCell>
              <TableCell className="text-center">-</TableCell>
              <TableCell className="text-center text-blue-700">
                {workingAll}
              </TableCell>
              <TableCell className="text-center">-</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
