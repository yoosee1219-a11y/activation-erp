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
import { Users } from "lucide-react";

interface StaffStat {
  staff: string;
  total: number;
  completed: number;
  pending: number;
  working: number;
  done: number;
  arcUnresolved: number;
  arcOverdue: number;
}

export function StaffStatsTable({ data }: { data: StaffStat[] }) {
  const totalAll = data.reduce((s, r) => s + Number(r.total), 0);
  const completedAll = data.reduce((s, r) => s + Number(r.completed), 0);
  const workingAll = data.reduce((s, r) => s + Number(r.working), 0);
  const doneAll = data.reduce((s, r) => s + Number(r.done), 0);
  const arcUnresolvedAll = data.reduce((s, r) => s + Number(r.arcUnresolved), 0);
  const arcOverdueAll = data.reduce((s, r) => s + Number(r.arcOverdue), 0);

  if (data.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-500" />
          담당자별 현황
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>담당자</TableHead>
              <TableHead className="text-center">전체</TableHead>
              <TableHead className="text-center">개통완료</TableHead>
              <TableHead className="text-center">대기</TableHead>
              <TableHead className="text-center">작업중</TableHead>
              <TableHead className="text-center">작업완료</TableHead>
              <TableHead className="text-center">보완 미제출</TableHead>
              <TableHead className="text-center">보완 기한초과</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.staff}>
                <TableCell className="font-medium">
                  {row.staff === "미배정" ? (
                    <span className="text-gray-400">{row.staff}</span>
                  ) : (
                    row.staff
                  )}
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
                  {Number(row.pending) > 0 ? (
                    <Badge className="bg-yellow-100 text-yellow-800">
                      {row.pending}
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
                  {Number(row.done) > 0 ? (
                    <Badge className="bg-green-100 text-green-700">
                      {row.done}
                    </Badge>
                  ) : (
                    <span className="text-gray-300">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {Number(row.arcUnresolved) > 0 ? (
                    <Badge className="bg-orange-100 text-orange-800">
                      {row.arcUnresolved}
                    </Badge>
                  ) : (
                    <span className="text-gray-300">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {Number(row.arcOverdue) > 0 ? (
                    <Badge className="bg-red-600 text-white">
                      {row.arcOverdue}
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
              <TableCell className="text-center text-green-700">{completedAll}</TableCell>
              <TableCell className="text-center">-</TableCell>
              <TableCell className="text-center text-blue-700">{workingAll}</TableCell>
              <TableCell className="text-center text-green-700">{doneAll}</TableCell>
              <TableCell className="text-center text-orange-700">{arcUnresolvedAll}</TableCell>
              <TableCell className="text-center text-red-700">{arcOverdueAll}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
