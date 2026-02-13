import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Building2, ChevronDown, Plus, Settings } from "lucide-react";
import { Link } from "wouter";

export function BrandSwitcher() {
  const { data, isLoading, refetch } = trpc.brandBrain.listBrands.useQuery();
  const setActiveBrand = trpc.brandBrain.setActiveBrand.useMutation({
    onSuccess: () => refetch(),
  });

  const brands = data?.brands || [];
  const organization = data?.organization;
  const activeBrandId = organization?.activeBrandId;
  const activeBrand = brands.find((b: any) => b.id === activeBrandId) || brands[0];

  const maxBrands = organization?.maxBrands || 1;
  const canAddBrand = maxBrands === -1 || brands.length < maxBrands;

  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" className="gap-2 text-gray-400" disabled>
        <Building2 className="h-4 w-4" />
        <span>Loading...</span>
      </Button>
    );
  }

  if (brands.length === 0) {
    return (
      <Link href="/brand-brain">
        <Button variant="ghost" size="sm" className="gap-2 text-emerald-400 hover:text-emerald-300">
          <Plus className="h-4 w-4" />
          <span>Create Brand</span>
        </Button>
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 max-w-[200px]">
          <Building2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span className="truncate">{activeBrand?.brandName || activeBrand?.productName || "Select Brand"}</span>
          <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 bg-gray-900 border-gray-700">
        <DropdownMenuLabel className="text-gray-400 text-xs uppercase tracking-wider">
          Your Brands
          {maxBrands !== -1 && (
            <Badge variant="outline" className="ml-2 text-xs">
              {brands.length}/{maxBrands}
            </Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-700" />
        
        {brands.map((brand: any) => (
          <DropdownMenuItem
            key={brand.id}
            onClick={() => setActiveBrand.mutate({ brandId: brand.id })}
            className={`cursor-pointer ${brand.id === activeBrandId ? "bg-emerald-500/10 text-emerald-400" : "text-gray-300 hover:text-white"}`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col">
                <span className="font-medium truncate max-w-[180px]">
                  {brand.brandName || brand.productName}
                </span>
                {brand.category && (
                  <span className="text-xs text-gray-500">{brand.category}</span>
                )}
              </div>
              {brand.id === activeBrandId && (
                <Badge className="bg-emerald-500/20 text-emerald-400 text-xs">Active</Badge>
              )}
            </div>
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator className="bg-gray-700" />
        
        {canAddBrand ? (
          <DropdownMenuItem asChild>
            <Link href="/brands/new" className="cursor-pointer text-emerald-400 hover:text-emerald-300">
              <Plus className="h-4 w-4 mr-2" />
              Add New Brand
            </Link>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem disabled className="text-gray-500">
            <Plus className="h-4 w-4 mr-2" />
            Upgrade to add more brands
          </DropdownMenuItem>
        )}
        
        <DropdownMenuItem asChild>
          <Link href="/brands" className="cursor-pointer text-gray-400 hover:text-white">
            <Settings className="h-4 w-4 mr-2" />
            Manage Brands
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
